-- ---------------------------------------------------------------------------
-- Migration 005: Expand media monitoring keywords
--
-- Problems addressed:
--   1. Only 7 articles found in 12 months — far too few given two major
--      ESABCC reports and significant press coverage.
--   2. Missing multilingual keywords (DE, FR, ES, IT, NL) — most European
--      outlets publish in their national language.
--   3. No report-specific keywords to capture coverage of ESABCC publications.
--   4. No policy-context keywords that catch articles mentioning the board
--      alongside EU climate legislation.
--   5. New tag categories needed: board_quote (individual board member
--      citation), institution_quote (ESABCC as institution), report
--      (coverage of specific publications).
--   6. Remove Ottmar Edenhofer "ESABCC chair" designation (not confirmed).
--
-- All inserts use ON CONFLICT DO NOTHING so re-running is safe.
-- ---------------------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Remove / update Ottmar Edenhofer chair designation
-- ═══════════════════════════════════════════════════════════════════════════

-- Update the label if it says "ESABCC chair" (set in live DB)
update public.media_keywords
  set label = 'TU Berlin / PIK',
      category = 'person',
      updated_at = now()
  where lower(keyword) = 'ottmar edenhofer'
    and (label ilike '%chair%' or label ilike '%ESABCC chair%');

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ESABCC institutional keywords — broader variations (EN)
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  -- Broader English variations
  ('EU climate board',                                    'EU climate board',              'institution_quote', 'en', 'any'),
  ('EU climate science advisory',                         'EU science advisory',           'institution_quote', 'en', 'any'),
  ('EU scientific advisory board climate',                'Advisory board ref',            'institution_quote', 'en', 'any'),
  ('European climate advisory',                           'European climate advisory',     'institution_quote', 'en', 'any'),
  ('climate advisory board Europe',                       'Climate advisory Europe',       'institution_quote', 'en', 'any'),
  ('EU climate scientists',                               'EU climate scientists',         'institution_quote', 'en', 'any'),
  ('EU independent climate advice',                       'Independent advice',            'institution_quote', 'en', 'any'),
  ('European Climate Law advisory board',                 'ECL advisory board',            'institution_quote', 'en', 'any'),
  ('ESABCC recommendation',                               'ESABCC recommendation',         'institution_quote', 'en', 'any'),
  ('ESABCC advice',                                       'ESABCC advice',                 'institution_quote', 'en', 'any'),
  ('ESABCC assessment',                                   'ESABCC assessment',             'institution_quote', 'en', 'any'),
  ('ESABCC opinion',                                      'ESABCC opinion',                'institution_quote', 'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ESABCC in other EU languages
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  -- German
  ('Europäischer Wissenschaftlicher Beirat für Klimawandel',  'ESABCC full name (DE)',     'institution_quote', 'de', 'any'),
  ('EU-Klimabeirat',                                          'EU climate board (DE)',      'institution_quote', 'de', 'any'),
  ('Klimabeirat EU',                                          'Climate board EU (DE)',      'institution_quote', 'de', 'any'),
  ('EU Klimawissenschaftlicher Beirat',                       'EU science board (DE)',      'institution_quote', 'de', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (DE)',        'institution_quote', 'de', 'any'),
  ('Wissenschaftlicher Beirat Klimawandel',                   'Science board climate (DE)', 'institution_quote', 'de', 'any'),

  -- French
  ('Comité consultatif scientifique européen sur le changement climatique', 'ESABCC full name (FR)', 'institution_quote', 'fr', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (FR)',        'institution_quote', 'fr', 'any'),
  ('comité scientifique climat européen',                     'EU science climate (FR)',    'institution_quote', 'fr', 'any'),
  ('conseil scientifique climat UE',                          'EU climate council (FR)',    'institution_quote', 'fr', 'any'),

  -- Spanish
  ('Comité Consultivo Científico Europeo sobre el Cambio Climático', 'ESABCC full name (ES)', 'institution_quote', 'es', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (ES)',        'institution_quote', 'es', 'any'),
  ('consejo asesor científico clima UE',                      'EU climate advisor (ES)',    'institution_quote', 'es', 'any'),

  -- Italian
  ('Comitato consultivo scientifico europeo sui cambiamenti climatici', 'ESABCC full name (IT)', 'institution_quote', 'it', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (IT)',        'institution_quote', 'it', 'any'),
  ('comitato scientifico clima UE',                           'EU climate committee (IT)',  'institution_quote', 'it', 'any'),

  -- Dutch
  ('Europees Wetenschappelijk Adviescomité over klimaatverandering', 'ESABCC full name (NL)', 'institution_quote', 'nl', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (NL)',        'institution_quote', 'nl', 'any'),
  ('EU-klimaatadviesraad',                                    'EU climate council (NL)',    'institution_quote', 'nl', 'any'),

  -- Polish
  ('Europejski Naukowy Komitet Doradczy ds. Zmiany Klimatu',  'ESABCC full name (PL)',     'institution_quote', 'pl', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (PL)',        'institution_quote', 'pl', 'any'),

  -- Danish
  ('ESABCC',                                                  'ESABCC acronym (DA)',        'institution_quote', 'da', 'any'),
  ('EU klimarådgivning',                                      'EU climate advice (DA)',     'institution_quote', 'da', 'any'),

  -- Swedish
  ('ESABCC',                                                  'ESABCC acronym (SV)',        'institution_quote', 'sv', 'any'),
  ('EU klimatvetenskapligt råd',                              'EU climate science (SV)',    'institution_quote', 'sv', 'any'),

  -- Portuguese
  ('ESABCC',                                                  'ESABCC acronym (PT)',        'institution_quote', 'pt', 'any'),
  ('Comité Científico Europeu sobre Alterações Climáticas',   'ESABCC full name (PT)',     'institution_quote', 'pt', 'any'),

  -- Greek
  ('ESABCC',                                                  'ESABCC acronym (EL)',        'institution_quote', 'el', 'any'),
  ('Ευρωπαϊκό Επιστημονικό Συμβουλευτικό Σώμα για την Κλιματική Αλλαγή', 'ESABCC full name (EL)', 'institution_quote', 'el', 'any'),

  -- Finnish
  ('ESABCC',                                                  'ESABCC acronym (FI)',        'institution_quote', 'fi', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Report-specific keywords — the 2 major ESABCC publications
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  -- Report 1: Scientific advice for the determination of an EU-wide 2040 climate target (2023/2024)
  ('EU 2040 climate target',                              '2040 target report',           'report',  'en', 'any'),
  ('EU 2040 climate target ESABCC',                       '2040 target + ESABCC',         'report',  'en', 'any'),
  ('2040 greenhouse gas reduction',                       '2040 GHG reduction',           'report',  'en', 'any'),
  ('EU 2040 emissions target',                            '2040 emissions target',        'report',  'en', 'any'),
  ('90% emission reduction 2040',                         '90% by 2040',                  'report',  'en', 'any'),
  ('EU-Klimaziel 2040',                                   '2040 target (DE)',             'report',  'de', 'any'),
  ('objectif climatique UE 2040',                         '2040 target (FR)',             'report',  'fr', 'any'),

  -- Report 2: Towards EU climate neutrality — progress, policy gaps and opportunities
  ('Towards EU climate neutrality',                       'Neutrality report',            'report',  'en', 'any'),
  ('EU climate neutrality progress',                      'Neutrality progress',          'report',  'en', 'any'),
  ('ESABCC climate neutrality report',                    'ESABCC neutrality report',     'report',  'en', 'any'),
  ('EU climate policy gaps',                              'Policy gaps',                  'report',  'en', 'any'),
  ('EU Klimaneutralität',                                 'Neutrality (DE)',              'report',  'de', 'any'),
  ('neutralité climatique UE',                            'Neutrality (FR)',              'report',  'fr', 'any'),

  -- General report references
  ('ESABCC report',                                       'ESABCC report general',        'report',  'en', 'any'),
  ('ESABCC Bericht',                                      'ESABCC report (DE)',           'report',  'de', 'any'),
  ('rapport ESABCC',                                      'ESABCC report (FR)',           'report',  'fr', 'any'),
  ('European Climate Law scientific advice',              'ECL scientific advice',        'report',  'en', 'any'),
  ('EU climate scientific assessment',                    'EU climate assessment',        'report',  'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. EU climate policy context keywords
--    (Catch articles about EU climate policy that reference the board)
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  ('European Climate Law',                                'European Climate Law',         'policy',  'en', 'any'),
  ('EU climate law advisory',                             'ECL advisory',                 'policy',  'en', 'any'),
  ('EU climate neutrality 2050',                          'EU 2050 neutrality',           'policy',  'en', 'any'),
  ('EU Fit for 55',                                       'Fit for 55',                   'policy',  'en', 'any'),
  ('EU Green Deal climate',                               'Green Deal climate',           'policy',  'en', 'any'),
  ('EU climate governance',                               'Climate governance',           'policy',  'en', 'any'),
  ('EU Klimagesetz',                                      'Climate law (DE)',             'policy',  'de', 'any'),
  ('Loi européenne sur le climat',                        'Climate law (FR)',             'policy',  'fr', 'any'),
  ('Ley Europea del Clima',                               'Climate law (ES)',             'policy',  'es', 'any'),
  ('Legge europea sul clima',                             'Climate law (IT)',             'policy',  'it', 'any'),
  ('Europese klimaatwet',                                 'Climate law (NL)',             'policy',  'nl', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Board member keywords — ensure all 15 members have proper coverage
--    with board_quote category for individual citation tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- Update existing person-category board members to board_quote where appropriate
-- (Keep 'person' for backward compat, add new board_quote entries for quote tracking)

insert into public.media_keywords (keyword, label, category, language, country) values
  -- Annela Anger-Kraavi
  ('Annela Anger-Kraavi climate',                         'Anger-Kraavi + climate',       'board_quote', 'en', 'any'),
  ('Anger-Kraavi',                                        'Anger-Kraavi surname',         'board_quote', 'en', 'any'),

  -- Constantinos Cartalis
  ('Constantinos Cartalis climate',                       'Cartalis + climate',           'board_quote', 'en', 'any'),
  ('Cartalis ESABCC',                                     'Cartalis + ESABCC',            'board_quote', 'en', 'any'),
  ('Κωνσταντίνος Καρτάλης',                               'Cartalis (EL)',                'board_quote', 'el', 'any'),

  -- Suraje Dessai
  ('Suraje Dessai climate',                               'Dessai + climate',             'board_quote', 'en', 'any'),
  ('Dessai ESABCC',                                       'Dessai + ESABCC',              'board_quote', 'en', 'any'),

  -- Laura Diaz Anadon
  ('Laura Díaz Anadón',                                   'Diaz Anadon (accented)',       'board_quote', 'en', 'any'),
  ('Diaz Anadon climate',                                 'Diaz Anadon + climate',        'board_quote', 'en', 'any'),
  ('Laura Diaz Anadon climate',                           'Diaz Anadon full + climate',   'board_quote', 'en', 'any'),

  -- Ottmar Edenhofer (kept as board member, NOT as chair)
  ('Edenhofer climate',                                   'Edenhofer + climate',          'board_quote', 'en', 'any'),
  ('Edenhofer ESABCC',                                    'Edenhofer + ESABCC',           'board_quote', 'en', 'any'),
  ('Ottmar Edenhofer Klimawandel',                        'Edenhofer (DE)',               'board_quote', 'de', 'any'),

  -- Vera Eory
  ('Vera Eory climate',                                   'Eory + climate',               'board_quote', 'en', 'any'),
  ('Eory ESABCC',                                         'Eory + ESABCC',                'board_quote', 'en', 'any'),

  -- Lena Kitzing
  ('Lena Kitzing climate',                                'Kitzing + climate',            'board_quote', 'en', 'any'),
  ('Lena Kitzing energy',                                 'Kitzing + energy',             'board_quote', 'en', 'any'),
  ('Kitzing ESABCC',                                      'Kitzing + ESABCC',             'board_quote', 'en', 'any'),

  -- Kati Kulovesi
  ('Kati Kulovesi climate',                               'Kulovesi + climate',           'board_quote', 'en', 'any'),
  ('Kulovesi ESABCC',                                     'Kulovesi + ESABCC',            'board_quote', 'en', 'any'),
  ('Kati Kulovesi',                                       'Kulovesi (FI)',                'board_quote', 'fi', 'any'),

  -- Lars J. Nilsson
  ('Lars Nilsson climate',                                'Nilsson + climate',            'board_quote', 'en', 'any'),
  ('Nilsson ESABCC',                                      'Nilsson + ESABCC',             'board_quote', 'en', 'any'),
  ('Lars J Nilsson',                                      'Nilsson no period',            'board_quote', 'en', 'any'),
  ('Lars Nilsson',                                        'Nilsson (SV)',                 'board_quote', 'sv', 'any'),

  -- Åsa Persson
  ('Åsa Persson climate',                                 'Persson + climate',            'board_quote', 'en', 'any'),
  ('Asa Persson climate',                                 'Persson alt + climate',        'board_quote', 'en', 'any'),
  ('Persson ESABCC',                                      'Persson + ESABCC',             'board_quote', 'en', 'any'),
  ('Åsa Persson',                                         'Persson (SV)',                 'board_quote', 'sv', 'any'),

  -- Keywan Riahi
  ('Keywan Riahi climate',                                'Riahi + climate',              'board_quote', 'en', 'any'),
  ('Riahi ESABCC',                                        'Riahi + ESABCC',               'board_quote', 'en', 'any'),
  ('Keywan Riahi IIASA',                                  'Riahi + IIASA',                'board_quote', 'en', 'any'),

  -- Jean-François Soussana
  ('Soussana climate',                                    'Soussana + climate',           'board_quote', 'en', 'any'),
  ('Soussana ESABCC',                                     'Soussana + ESABCC',            'board_quote', 'en', 'any'),
  ('Jean-François Soussana climat',                       'Soussana (FR)',                'board_quote', 'fr', 'any'),
  ('Soussana INRAE climat',                               'Soussana INRAE (FR)',          'board_quote', 'fr', 'any'),

  -- Giorgio Vacchiano
  ('Giorgio Vacchiano clima',                             'Vacchiano (IT)',               'board_quote', 'it', 'any'),
  ('Vacchiano climate',                                   'Vacchiano + climate',          'board_quote', 'en', 'any'),
  ('Vacchiano ESABCC',                                    'Vacchiano + ESABCC',           'board_quote', 'en', 'any'),

  -- Detlef van Vuuren
  ('Detlef van Vuuren climate',                           'van Vuuren + climate',         'board_quote', 'en', 'any'),
  ('van Vuuren ESABCC',                                   'van Vuuren + ESABCC',          'board_quote', 'en', 'any'),
  ('van Vuuren PBL',                                      'van Vuuren + PBL',             'board_quote', 'en', 'any'),
  ('Detlef van Vuuren klimaat',                           'van Vuuren (NL)',              'board_quote', 'nl', 'any'),

  -- Zinta Zommers
  ('Zinta Zommers climate',                               'Zommers + climate',            'board_quote', 'en', 'any'),
  ('Zommers ESABCC',                                      'Zommers + ESABCC',             'board_quote', 'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Affiliated institutions — expanded
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  ('INRAE climate',                                       'INRAE + climate',              'institution', 'en', 'any'),
  ('INRAE changement climatique',                         'INRAE + climate (FR)',         'institution', 'fr', 'any'),
  ('University of Cambridge climate policy',              'Cambridge climate policy',     'institution', 'en', 'any'),
  ('University of Leeds climate',                         'Leeds climate',                'institution', 'en', 'any'),
  ('Lund University climate',                             'Lund climate',                 'institution', 'en', 'any'),
  ('DTU energy transition',                               'DTU energy',                   'institution', 'en', 'any'),
  ('Scotland Rural College climate',                      'SRUC climate',                 'institution', 'en', 'any'),
  ('KTH climate action',                                  'KTH climate',                  'institution', 'en', 'any'),
  ('Stockholm Environment Institute climate',             'SEI climate',                  'institution', 'en', 'any'),
  ('PIK Potsdam Klimaforschung',                          'PIK (DE)',                     'institution', 'de', 'any'),
  ('University of Milan forest climate',                  'Milan forest climate',         'institution', 'en', 'any'),
  ('University of Eastern Finland climate law',           'UEF climate law',              'institution', 'en', 'any'),
  ('University of Toronto climate',                       'Toronto climate',              'institution', 'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Update existing ESABCC-category keywords to institution_quote
--    (retroactively tag the original 5 ESABCC keywords for consistency)
-- ═══════════════════════════════════════════════════════════════════════════

-- Keep the original 'esabcc' category for the core keywords, but ensure
-- articles matched by them are also recognisable as institutional quotes.
-- No update needed — the category filter in the dashboard already groups them.
