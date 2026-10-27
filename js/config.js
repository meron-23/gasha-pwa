// Gasha settings. Your developer edits this file; nothing else needs to change for a demo.
window.GASHA_CONFIG = {
  version: '0.4.0',

  // Guys Special Needs Center: used by "Call my center", the Right-now "call the center" button and the center card.
  center: {
    name: 'Guys Special Needs Center',
    code: 'GUYS01',                 // any code starting with "GUYS" is accepted in onboarding
    phone: '+251110000000',         // TODO: real number (international format, no spaces)
    telegram: '',                   // TODO: e.g. 'https://t.me/guyscenter'
    area: 'Addis Ababa'
  },

  // Emergency numbers (also listed in content.json > pages.safety). Confirm before launch.
  emergency: { ambulance: '907', police: '991', fire: '939' },

  // Where "Ask a question" sends questions. Leave empty for the demo: questions are kept on the phone.
  // When set, the app POSTs JSON {text, child, city, at, device} to this URL.
  questionEndpoint: '',

  // Public address of the app, used in share links (Telegram, WhatsApp).
  publicUrl: '',                    // e.g. 'https://gasha.et'

  // Demo helpers for the client presentation
  demo: {
    otp: '482715',                  // code pre-filled on the SMS screen (no SMS is sent in the demo)
    showDemoAnswer: true            // after asking a question, show matching answers from the library
  }
};
