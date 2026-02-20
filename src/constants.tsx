// Remove the import and add this interface
export interface YorubaCharSet {
    base: string;
    high: string;
    low: string;
}

export const YORUBA_VOWELS: Record<string, YorubaCharSet> = {
    'a': { base: 'a', high: 'á', low: 'à' },
    'e': { base: 'e', high: 'é', low: 'è' },
    'ẹ': { base: 'ẹ', high: 'ẹ́', low: 'ẹ̀' },
    'i': { base: 'i', high: 'í', low: 'ì' },
    'o': { base: 'o', high: 'ó', low: 'ò' },
    'ọ': { base: 'ọ', high: 'ọ́', low: 'ọ̀' },
    'u': { base: 'u', high: 'ú', low: 'ù' },
    'n': { base: 'n', high: 'ń', low: 'ǹ' }
};

export const SUB_DOTS = {
    'e': 'ẹ',
    'o': 'ọ',
    's': 'ṣ',
    'E': 'Ẹ',
    'O': 'Ọ',
    'S': 'Ṣ'
};

export const KEYBOARD_LAYOUT = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace'],
    ['Fn', 'Space', 'ẹ', 'ọ', 'ṣ']
];

// Google Forms configuration for cloud sync
// Form: ODU Keyboard Data
export const GOOGLE_FORMS_CONFIG = {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScNP66GmqlrKCz-t7F72-1c_qGHWjcMEN7BQ_L5nOXf4e-7Bg/formResponse',
    fields: {
        english: 'entry.499483355',
        yoruba: 'entry.135436059',
        username: 'entry.1223474895',
        email: 'entry.1821413739',
        mode: 'entry.1838429192',
        timestamp: 'entry.116415145',
    },
};

// Google Sheet CSV URL for Global Leaderboard
// PLACEHOLDER: Replace with your published Google Sheet CSV URL
// Steps: Open linked Sheet → File → Share → Publish to web → select CSV → copy link
export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LXvGndE7mpmb6giesgNXeY8ZJgjFJIYAFLrJ3AD0HMnoStbnHfyEgIJ-0qOlzXQIuzuCAa_s3-0Q/pub?output=csv';

export const SUGGESTIONS_CACHE_KEY = 'odu-suggestions-cache';

// Direct-edit Google Sheet URLs for admin panel (replace with your actual edit links)
// To get these: open your Google Sheet → copy the URL from the browser address bar
export const GOOGLE_SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/1J7ghHkOX9I4C2MppqJzm-wmfMDyxOdNmdp3fA69eMP8/edit?resourcekey=&gid=198739083#gid=198739083';
export const GOOGLE_QUIZ_SHEET_EDIT_URL = '';

// Google Sheet CSV URL for Quiz Data (remote quiz entries)
// PLACEHOLDER: Create a new tab in your Google Sheet for quizzes with columns: english, yoruba_answer, category, difficulty
// Then publish that tab as CSV and paste the URL here
export const GOOGLE_QUIZ_SHEET_CSV_URL = '';

// Google Forms configuration for Quiz Admin Panel
// PLACEHOLDER: Create a new Google Form with fields: english, yoruba_answer, category, difficulty
// Then fill in the form URL and entry IDs below
export const GOOGLE_QUIZ_FORMS_CONFIG = {
    formUrl: '',
    fields: {
        english: 'entry.REPLACE_ME',
        yoruba_answer: 'entry.REPLACE_ME',
        category: 'entry.REPLACE_ME',
        difficulty: 'entry.REPLACE_ME',
    },
};