#!/usr/bin/env python3
"""Cluster analysis of the National Level Climate Policies beta-module dataset.

Input:  public/data/national-climate-policies.json  (535 EU-27 laws & policies,
        Climate Change Laws of the World snapshot, CC-BY 4.0)

Two complementary views:
  1. Policy-level clustering — K-Means on combined TF-IDF text features
     (title + summary) and multi-hot categorical features (sectors,
     instruments, responses, hazards). k chosen by silhouette scan.
  2. Country-level clustering — Ward hierarchical clustering of the 27
     member states on their policy-mix profiles (sector/instrument shares,
     adaptation share, law share, recency).

Outputs (written to ./output/):
  - PNG figures (silhouette scan, 2-D map, lift heatmaps, timeline,
    country dendrogram + profile heatmap)
  - cluster_assignments.csv, country_clusters.csv
  - INSIGHTS.md summary statistics dump (numbers used in the report)
"""

import json
import os
from collections import Counter

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import dendrogram, fcluster, linkage
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler, normalize

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
DATA = os.path.join(REPO, "public", "data", "national-climate-policies.json")
OUT = os.path.join(HERE, "output")
os.makedirs(OUT, exist_ok=True)

RNG = 42

# ---------------------------------------------------------------- load + clean

with open(DATA) as f:
    payload = json.load(f)
policies = payload["policies"]

# The CCLW taxonomy contains near-duplicate labels; fold them together so the
# one-hot features don't split the same concept across two columns.
SECTOR_ALIASES = {"Transport": "Transportation", "Environment": "Adaptation"}
HAZARD_ALIASES = {
    "Floods": "Flood",
    "Droughts": "Drought",
    "Soil Erosion": "Erosion",
    "Coastal Erosion": "Erosion",
    "Hurricanes": "Storms",
    "Cyclones": "Storms",
    "Storm Surge": "Storms",
    "Heatwaves": "Heat Waves And Heat Stress",
    "Heat Waves": "Heat Waves And Heat Stress",
}


def canon(values, aliases):
    return sorted({aliases.get(v, v) for v in (values or [])})


for p in policies:
    p["sectors"] = canon(p.get("sectors"), SECTOR_ALIASES)
    p["hazards"] = canon(p.get("hazards"), HAZARD_ALIASES)
    p["responses"] = canon(p.get("responses"), {})
    p["instruments"] = canon(p.get("instruments"), {})

df = pd.DataFrame(policies)
print(f"{len(df)} policies, {df.countryCode.nunique()} countries")

# ------------------------------------------------------- policy-level features

text = (df["title"].fillna("") + ". " + df["summary"].fillna("")).tolist()
stop = list(
    ENGLISH_STOP_WORDS
    | {
        # boilerplate that appears in nearly every CCLW summary
        "law", "act", "decree", "plan", "policy", "national", "shall",
        "article", "articles", "measures", "framework", "strategy", "sets",
        "aims", "states", "establishes", "provides", "related", "regulation",
        "programme", "ministry", "minister", "government", "european", "eu",
    }
)
tfidf = TfidfVectorizer(
    stop_words=stop, max_features=4000, min_df=3, max_df=0.5, sublinear_tf=True
)
X_text = tfidf.fit_transform(text)
svd = TruncatedSVD(n_components=120, random_state=RNG)
X_text_red = normalize(svd.fit_transform(X_text))
print(f"TF-IDF: {X_text.shape[1]} terms -> 120 SVD dims "
      f"({svd.explained_variance_ratio_.sum():.0%} var)")


def multihot(series, prefix, min_count=5):
    counts = Counter(v for lst in series for v in lst)
    cols = [v for v, c in counts.items() if c >= min_count]
    mat = np.zeros((len(series), len(cols)))
    idx = {v: i for i, v in enumerate(cols)}
    for r, lst in enumerate(series):
        for v in lst:
            if v in idx:
                mat[r, idx[v]] = 1.0
    return mat, [f"{prefix}:{c}" for c in cols]


parts, names = [], []
for field, prefix in [
    ("sectors", "sec"), ("instruments", "inst"),
    ("responses", "resp"), ("hazards", "haz"),
]:
    m, n = multihot(df[field], prefix)
    parts.append(m)
    names += n
X_cat = np.hstack(parts)
X_cat_n = normalize(X_cat)

# Equal-weight blend of semantic (text) and taxonomic (categorical) signal.
X = np.hstack([X_text_red, X_cat_n])

# ------------------------------------------------------------- choose k, fit

ks = range(3, 13)
sil = []
for k in ks:
    km = KMeans(n_clusters=k, n_init=20, random_state=RNG).fit(X)
    sil.append(silhouette_score(X, km.labels_))
best_k = list(ks)[int(np.argmax(sil))]
print("silhouette by k:", dict(zip(ks, np.round(sil, 3))), "-> k =", best_k)

km = KMeans(n_clusters=best_k, n_init=50, random_state=RNG).fit(X)
df["cluster"] = km.labels_

fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(list(ks), sil, "o-", color="#1a6840")
ax.axvline(best_k, ls="--", color="grey")
ax.set_xlabel("k (number of clusters)")
ax.set_ylabel("silhouette score")
ax.set_title("K-Means model selection — policy-level clustering")
fig.tight_layout()
fig.savefig(os.path.join(OUT, "01_silhouette_scan.png"), dpi=150)

# ------------------------------------------------- characterise the clusters

terms = np.array(tfidf.get_feature_names_out())
X_text_dense = np.asarray(X_text.todense())
overall_term_mean = X_text_dense.mean(axis=0)
overall_cat_mean = X_cat.mean(axis=0)

cluster_info = []
for c in range(best_k):
    mask = df["cluster"].values == c
    n = int(mask.sum())
    # distinctive terms: centroid TF-IDF relative to corpus mean
    delta = X_text_dense[mask].mean(axis=0) - overall_term_mean
    top_terms = terms[np.argsort(delta)[::-1][:12]].tolist()
    # categorical lift
    lift = (X_cat[mask].mean(axis=0) + 1e-9) / (overall_cat_mean + 1e-9)
    support = X_cat[mask].mean(axis=0)
    feats = sorted(
        [
            (names[i], lift[i], support[i])
            for i in range(len(names))
            if support[i] >= 0.25
        ],
        key=lambda t: -t[1],
    )[:8]
    info = {
        "cluster": c,
        "n": n,
        "share_law": float((df.loc[mask, "category"] == "Law").mean()),
        "median_year": float(df.loc[mask, "year"].median()),
        "top_countries": df.loc[mask, "countryCode"].value_counts().head(5).to_dict(),
        "top_terms": top_terms,
        "top_features": [(f, round(l, 1), round(s, 2)) for f, l, s in feats],
        "examples": df.loc[mask].sample(min(3, n), random_state=RNG)["title"]
        .str.slice(0, 90).tolist(),
    }
    cluster_info.append(info)
    print(f"\n— Cluster {c} (n={n}, law share {info['share_law']:.0%}, "
          f"median year {info['median_year']:.0f})")
    print("  terms:", ", ".join(top_terms))
    print("  features:", info["top_features"][:5])

# ----------------------------------------------------------------- 2-D map

xy = TSNE(
    n_components=2, perplexity=35, init="pca", random_state=RNG, max_iter=1500
).fit_transform(X)
df["tsne_x"], df["tsne_y"] = xy[:, 0], xy[:, 1]

cmap = plt.get_cmap("tab10")
fig, ax = plt.subplots(figsize=(10, 8))
for c in range(best_k):
    m = df["cluster"] == c
    ax.scatter(df.loc[m, "tsne_x"], df.loc[m, "tsne_y"], s=22, alpha=0.75,
               color=cmap(c), label=f"C{c} (n={m.sum()})")
    cx, cy = df.loc[m, "tsne_x"].median(), df.loc[m, "tsne_y"].median()
    ax.annotate(f"C{c}", (cx, cy), fontsize=13, fontweight="bold",
                ha="center", bbox=dict(boxstyle="round", fc="white", alpha=0.8))
ax.legend(loc="upper right", fontsize=8)
ax.set_title("EU-27 national climate laws & policies — t-SNE map of "
             f"{best_k} K-Means clusters (n={len(df)})")
ax.set_xticks([]), ax.set_yticks([])
fig.tight_layout()
fig.savefig(os.path.join(OUT, "02_policy_clusters_tsne.png"), dpi=150)

# ------------------------------------------------------------- lift heatmaps


def lift_heatmap(field, fname, title, top_n=14):
    counts = Counter(v for lst in df[field] for v in lst)
    cats = [v for v, _ in counts.most_common(top_n)]
    mat = np.zeros((best_k, len(cats)))
    overall = np.array([
        df[field].apply(lambda lst: v in lst).mean() for v in cats
    ])
    for c in range(best_k):
        sub = df[df["cluster"] == c]
        for j, v in enumerate(cats):
            share = sub[field].apply(lambda lst: v in lst).mean()
            mat[c, j] = share / overall[j] if overall[j] else 0
    fig, ax = plt.subplots(figsize=(11, 0.6 * best_k + 2.5))
    im = ax.imshow(mat, cmap="RdYlGn", vmin=0, vmax=2.5, aspect="auto")
    ax.set_xticks(range(len(cats)))
    ax.set_xticklabels([c[:26] for c in cats], rotation=40, ha="right", fontsize=8)
    ax.set_yticks(range(best_k))
    ax.set_yticklabels([f"C{c} (n={(df.cluster == c).sum()})" for c in range(best_k)])
    for i in range(best_k):
        for j in range(len(cats)):
            ax.text(j, i, f"{mat[i, j]:.1f}", ha="center", va="center", fontsize=7)
    ax.set_title(title + "  (lift vs corpus average; 1.0 = average)")
    fig.colorbar(im, ax=ax, shrink=0.8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, fname), dpi=150)


lift_heatmap("sectors", "03_cluster_sector_lift.png", "Cluster × sector")
lift_heatmap("instruments", "04_cluster_instrument_lift.png", "Cluster × instrument")

# ------------------------------------------------------------------ timeline

fig, ax = plt.subplots(figsize=(11, 5))
years = np.arange(1990, 2023)
bottom = np.zeros(len(years))
for c in range(best_k):
    counts = df[df["cluster"] == c]["year"].value_counts()
    h = np.array([counts.get(y, 0) for y in years], dtype=float)
    ax.bar(years, h, bottom=bottom, color=cmap(c), label=f"C{c}", width=0.85)
    bottom += h
ax.legend(fontsize=8, ncol=2)
ax.set_title("Adoption timeline by cluster (1990–2022)")
ax.set_xlabel("year of adoption")
ax.set_ylabel("policies adopted")
fig.tight_layout()
fig.savefig(os.path.join(OUT, "05_timeline_by_cluster.png"), dpi=150)

# ----------------------------------------------------- country-level profiles
# Profile each member state by its *composition* across the policy-level
# clusters (what mix of policy types it relies on), plus a few intensity
# stats. Composition is a fairer basis than raw taxonomy shares, which made
# small-portfolio countries degenerate into singletons.

comp = (
    pd.crosstab(df["countryCode"], df["cluster"], normalize="index")
    .reindex(columns=range(best_k), fill_value=0.0)
)
comp.columns = [f"C{c}" for c in comp.columns]

extra = df.groupby("countryCode").apply(
    lambda sub: pd.Series({
        "law_share": (sub["category"] == "Law").mean(),
        "adaptation_share": sub["responses"].apply(
            lambda r: "Adaptation" in r).mean(),
        "recent_share": (sub["year"] >= 2015).mean(),
    }),
    include_groups=False,
)
cdf = comp.join(extra)
cdf["n_policies"] = df.groupby("countryCode").size()
cdf["median_year"] = df.groupby("countryCode")["year"].median()

feat_cols = list(comp.columns) + ["law_share", "adaptation_share", "recent_share"]
Z_feats = StandardScaler().fit_transform(cdf[feat_cols].values)
link = linkage(Z_feats, method="ward")

# pick the cut with the best country-level silhouette (3..6 groups)
cands = {
    t: silhouette_score(Z_feats, fcluster(link, t=t, criterion="maxclust"))
    for t in range(3, 7)
}
N_COUNTRY_CLUSTERS = max(cands, key=cands.get)
print("country-level silhouette by cut:", {k: round(v, 2) for k, v in cands.items()},
      "->", N_COUNTRY_CLUSTERS, "groups")
cdf["cluster"] = fcluster(link, t=N_COUNTRY_CLUSTERS, criterion="maxclust")

fig, ax = plt.subplots(figsize=(11, 6))
dendrogram(link, labels=cdf.index.tolist(), ax=ax, color_threshold=link[-3, 2])
ax.set_title("EU-27 country typology — Ward hierarchical clustering of "
             "policy-mix profiles")
ax.set_ylabel("Ward distance")
fig.tight_layout()
fig.savefig(os.path.join(OUT, "06_country_dendrogram.png"), dpi=150)

# country × profile heatmap ordered by typology group
order = cdf.sort_values(["cluster", "n_policies"], ascending=[True, False]).index
show = cdf.loc[order, feat_cols]
fig, ax = plt.subplots(figsize=(11, 9))
im = ax.imshow(show.values, cmap="YlGnBu", vmin=0, vmax=0.5, aspect="auto")
ax.set_yticks(range(len(order)))
ax.set_yticklabels(
    [f"{c}  (T{cdf.loc[c, 'cluster']}, n={cdf.loc[c, 'n_policies']:.0f})"
     for c in order], fontsize=8)
ax.set_xticks(range(len(feat_cols)))
ax.set_xticklabels(feat_cols, rotation=45, ha="right", fontsize=8)
prev = None
for i, c in enumerate(order):
    if prev is not None and cdf.loc[c, "cluster"] != prev:
        ax.axhline(i - 0.5, color="black", lw=1.5)
    prev = cdf.loc[c, "cluster"]
ax.set_title("Country portfolios: share of national policies in each policy "
             "cluster C0–C11,\ngrouped by typology cluster (capped at 0.5)")
fig.colorbar(im, ax=ax, shrink=0.7)
fig.tight_layout()
fig.savefig(os.path.join(OUT, "07_country_profiles_heatmap.png"), dpi=150)

print("\nCountry typology:")
zdf = pd.DataFrame(Z_feats, index=cdf.index, columns=feat_cols)
for t, sub in cdf.groupby("cluster"):
    print(f"  T{t}: {', '.join(sub.index)}")
    desc = zdf.loc[sub.index].mean()
    print("      strongest traits:",
          ", ".join(f"{k}={v:+.1f}" for k, v in
                    desc.reindex(desc.abs().sort_values(ascending=False)
                                 .head(5).index).items()))

# -------------------------------------------------------------------- exports

df[["id", "countryCode", "title", "category", "year", "cluster"]].to_csv(
    os.path.join(OUT, "cluster_assignments.csv"), index=False)
cdf.rename_axis("country").reset_index()[
    ["country", "cluster", "n_policies", "law_share",
     "adaptation_share", "median_year", "recent_share"]].to_csv(
    os.path.join(OUT, "country_clusters.csv"), index=False)

with open(os.path.join(OUT, "cluster_stats.json"), "w") as f:
    json.dump(
        {
            "n_policies": len(df),
            "best_k": best_k,
            "silhouette": dict(zip(map(int, ks), map(float, sil))),
            "clusters": cluster_info,
            "country_typology": {
                f"T{t}": sub.index.tolist() for t, sub in cdf.groupby("cluster")
            },
        },
        f, indent=2,
    )

print("\nDone. Outputs in", OUT)
