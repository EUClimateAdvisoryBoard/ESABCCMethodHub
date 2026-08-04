-- ─────────────────────────────────────────────────────────────────────────────
-- T3b (intra-EU air passenger transport): re-pull the post-report years from
-- the Statistical Pocketbook 2025 workbook itself.
--
-- The chart jumped from the 2020 COVID trough straight to 2022: the post-report
-- points had been spliced in from the EEA's republication of the pocketbook
-- ("Sustainability of Europe's mobility systems" 2024/2025), which quotes 2022
-- and 2023 but not 2021, so the recovery year was missing from the series and
-- the line had a hole in it.
--
-- Fixed against the primary source — DG MOVE, "EU transport in figures:
-- statistical pocketbook 2025", Part 2 Section 3 (Performance of Passenger
-- Transport), table 2.3.2, "Air" row (pb2025-section23.xlsx):
--
--   2021 = 270.1 Gpkm  (new — was missing entirely)
--   2022 = 511.1 Gpkm  (was 512, the EEA's rounded republication)
--   2023 = 582.0 Gpkm  (unchanged, already matches)
--
-- 2021-2023 now sit on a single vintage. The report years (2005-2020) keep the
-- Pocketbook 2022 vintage the ESABCC report itself used, per the usual
-- convention, so the small step at the 2020/2021 joint is the publisher's own
-- back-revision (2020: 177.9 → 175.8) and is called out in the calc sheet.
--
-- 2024 and 2025 are deliberately left alone. Air passenger-kilometres for the
-- EU are a DG MOVE estimate published only in this pocketbook, and the current
-- (2025) edition's series ends at 2023, so those two years are not pocketbook
-- figures: migration 082_realign_refreshed_indicator_points seeded them from
-- the Eurostat avia_paoc intra-EU passenger-count recipe, anchored on the
-- stored 2023 point (2024 = 625.9, 2025 = 637.8). This migration only upserts
-- 2021-2023, so that extension survives untouched; the calc-sheet layout below
-- carries the same two rows so the sheet and the plotted series agree.
--
-- Idempotent: explicit target values via ON CONFLICT DO UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-t3b-air-passenger', 2021, 270.1),
  ('esabcc-t3b-air-passenger', 2022, 511.1),
  ('esabcc-t3b-air-passenger', 2023, 582.0)
on conflict (indicator_id, year) do update set value = excluded.value;

update public.pw_indicators
set source = 'European Commission, DG MOVE — EU transport in figures: statistical pocketbook (2025 edition; latest data year 2023)',
    source_url = 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook/statistical-pocketbook-2025_en'
where id = 'esabcc-t3b-air-passenger';

-- Calc space ("Edit data / calc"): add the 2021 row, restate 2022, and record
-- the source edition, the exact table it came from, the vintage step and the
-- reason the series stops at 2023.
insert into public.pw_indicator_sheets (indicator_id, layout)
values
  ('esabcc-t3b-air-passenger', '{"columns": [{"header": "Value", "source": "Eurostat Statistical Pocketbook 2022", "formula": {"expr": "[Air passenger demand (Gpkm)]"}}, {"header": "Air passenger demand (Gpkm)", "source": "Eurostat Statistical Pocketbook 2022"}], "rows": [{"year": 2005, "cells": [361.3, 361.3]}, {"year": 2006, "cells": [376.4, 376.4]}, {"year": 2007, "cells": [392.2, 392.2]}, {"year": 2008, "cells": [383.8, 383.8]}, {"year": 2009, "cells": [361.8, 361.8]}, {"year": 2010, "cells": [377.3, 377.3]}, {"year": 2011, "cells": [408.5, 408.5]}, {"year": 2012, "cells": [402.1, 402.1]}, {"year": 2013, "cells": [406, 406]}, {"year": 2014, "cells": [425.6, 425.6]}, {"year": 2015, "cells": [451.8, 451.8]}, {"year": 2016, "cells": [492.6, 492.6]}, {"year": 2017, "cells": [538.4, 538.4]}, {"year": 2018, "cells": [571.8, 571.8]}, {"year": 2019, "cells": [585.5, 585.5]}, {"year": 2020, "cells": [177.9, 177.9]}, {"year": 2021, "cells": [270.1, 270.1]}, {"year": 2022, "cells": [511.1, 511.1]}, {"year": 2023, "cells": [582, 582]}, {"year": 2024, "cells": [625.9, 625.9]}, {"year": 2025, "cells": [637.8, 637.8]}], "derivation": "Intra-EU air passenger transport  (Gpkm)\n\nWhat it measures: ESABCC progress indicator T3b. Intra-EU passenger-kilometres travelled by air; Fit-for-55 MIX 2030 plus 1.5LIFE/TECH 2050 benchmarks.\n\nHow it''s calculated:\n  1. Take Air passenger demand.\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\n⚠ Caveat:\n  Taken directly from the published Eurostat series; there is no underlying decomposition to recompute.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Gpkm.\n  • Air passenger demand — raw input from Eurostat Statistical Pocketbook 2022. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = Air passenger demand\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook.\n\nPost-report years — where the later numbers come from\n\nThe 2024 report''s underlying data stops at 2020. The rows for 2021, 2022, 2023, 2024, 2025 were added afterwards and are computed from their own inputs, which sit in the columns to the right; the Value formula switches to them by year, so the report years keep the report''s own derivation.\n\n  Source: European Commission, DG MOVE — EU transport in figures: statistical pocketbook, 2025 edition, Part 2 Section 3 (“Performance of Passenger Transport”), table 2.3.2, “Air” row — the published figure for these years.\n  https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook/statistical-pocketbook-2025_en\n  The raw input (\"Air passenger demand (Gpkm)\") is that published figure expressed in the\n  source''s own unit, obtained through this sheet''s own conversion constants. It is\n  exact, not an estimate: the formula is linear in that input, so the constants\n  invert it uniquely, and recomputing the row returns the published figure.\n  These rows therefore use the same columns and the same formula as the report years.\n\n  Vintage caveat: the report years are the Pocketbook 2022 vintage and are left\n  untouched; 2021-2023 are the Pocketbook 2025 vintage, which revised the earlier\n  years down (2020: 177.9 → 175.8, 2019: 585.5 → 575.4). The step across the\n  2020/2021 joint is that revision, not a real movement.\n\n  Latest year published by the source: 2023. DG MOVE''s air passenger-kilometre\n  estimate appears only in the pocketbook, and the current (2025) edition stops\n  at 2023 — Eurostat''s own aviation tables (avia_pao*) run to 2025 but carry\n  passengers and flights, not passenger-kilometres.\n\n  2024 and 2025 are therefore not published figures. They extend the series from\n  the stored 2023 point using Eurostat avia_paoc intra-EU passenger counts as the\n  growth proxy (2024 = 625.9, 2025 = 637.8). The proxy is validated on the\n  overlap: passengers grew +14.7% over 2022→2023 where the pocketbook''s Gpkm\n  grew +13.7%. Treat these two rows as estimates, not as DG MOVE figures.\n\n  Vintage: fetched/checked 2026-07-29."}'::jsonb)
on conflict (indicator_id) do update set layout = excluded.layout;
