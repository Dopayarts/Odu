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
        username: 'entry.2015949297',
        mode: 'entry.1838429192',
        timestamp: 'entry.116415145',
    },
};

// Google Sheet CSV URL for Global Leaderboard
// PLACEHOLDER: Replace with your published Google Sheet CSV URL
// Steps: Open linked Sheet → File → Share → Publish to web → select CSV → copy link
export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LXvGndE7mpmb6giesgNXeY8ZJgjFJIYAFLrJ3AD0HMnoStbnHfyEgIJ-0qOlzXQIuzuCAa_s3-0Q/pub?output=csv';