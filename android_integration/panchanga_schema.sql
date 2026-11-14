-- ====================================================================
-- Ghaule Calculator / Android Offline Panchanga Database Schema
-- Table Definition for SQLite & Android Room Database
-- ====================================================================

CREATE TABLE IF NOT EXISTS panchanga_records (
    id INTEGER PRIMARY KEY,                      -- Unique record ID (from Mero Miti: e.g. 2246)
    year INTEGER NOT NULL,                       -- Bikram Sambat Year (e.g. 2083)
    month INTEGER NOT NULL,                      -- Bikram Sambat Month (1 to 12)
    gate INTEGER NOT NULL,                       -- Gate / Day of the Month (1 to 32)
    baar TEXT NOT NULL,                          -- Day of the week in Nepali (e.g. मंगलबार)
    tithi TEXT NOT NULL,                         -- Lunar Tithi in Nepali (e.g. द्वादशी)
    tithiGhaPa TEXT,                            -- Ghati / Pala for Tithi end
    tithiEnds TEXT,                             -- Transliterated Tithi name
    nakshatra TEXT,                             -- Nakshatra in Nepali
    nakshatraGhaPa TEXT,                        -- Ghati / Pala for Nakshatra end
    nakshatraEnds TEXT,                         -- Transliterated Nakshatra
    yoga TEXT,                                  -- Yoga in Nepali
    yogaGhaPa TEXT,                             -- Ghati / Pala for Yoga
    yogaEnds TEXT,                              -- Transliterated Yoga
    karana TEXT,                                -- Karana in Nepali
    karanaGhaPa TEXT,                           -- Ghati / Pala for Karana
    karanaEnds TEXT,                            -- Transliterated Karana
    moonSign TEXT,                              -- Moon sign (Rashi) in Nepali (e.g. मेष)
    dinMaan TEXT,                               -- Dinmaan duration (Ghati-Pala or HH:MM)
    sunrise TEXT NOT NULL,                       -- Local Sunrise Time (HH:MM e.g. 05:42)
    sunset TEXT NOT NULL,                        -- Local Sunset Time (HH:MM e.g. 18:28)
    englishDate TEXT NOT NULL,                  -- Gregorian Equivalent (YYYY-MM-DD e.g. 2026-04-14)
    festivals TEXT,                             -- Comma-separated festivals & cultural notes
    isHoliday INTEGER NOT NULL DEFAULT 0,       -- 1 if Gazetted Public Holiday, else 0
    iconUrl TEXT,                               -- Icon asset URL or resource identifier
    bgUrl TEXT,                                 -- Background asset URL
    dailyLagan TEXT,                            -- Auspicious lagan timings (JSON string)
    planetary TEXT,                             -- Planetary hora / planetary positions (JSON string)
    tithiName TEXT,                             -- Clean Tithi name
    nakshatraName TEXT,                         -- Clean Nakshatra name
    pakshya TEXT,                               -- Pakshya in Nepali (शुक्ल / कृष्ण)
    pakshyaEn TEXT,                             -- Pakshya in English (Shukla / Krishna)
    isShukla INTEGER NOT NULL DEFAULT 0,        -- 1 if Shukla Pakshya, 0 if Krishna Pakshya
    chandraRashi TEXT,                          -- Chandra Rashi in Nepali
    chandraRashiEn TEXT,                        -- Chandra Rashi in English
    rashiName TEXT,                             -- Active Rashi name
    rashiBefore TEXT,                           -- Rashi before transition
    rashiAfter TEXT,                            -- Rashi after transition
    rashiTransitionTime TEXT,                   -- Transit time in English
    rashiTransitionTimeNe TEXT,                 -- Transit time in Nepali
    isTransitionDay INTEGER NOT NULL DEFAULT 0  -- 1 if Rashi sankranti / transition occurs
);

-- Fast lookup indexes for calendar navigation and daily widgets
CREATE INDEX IF NOT EXISTS idx_panchanga_bs_date ON panchanga_records(year, month, gate);
CREATE INDEX IF NOT EXISTS idx_panchanga_ad_date ON panchanga_records(englishDate);
CREATE INDEX IF NOT EXISTS idx_panchanga_holiday ON panchanga_records(year, isHoliday);
CREATE INDEX IF NOT EXISTS idx_panchanga_tithi ON panchanga_records(year, month, tithi);
