const emailService = require('./emailService');

emailService
    .sendPasswordReset(
        'priyajogi081@gmail.com',
        'https://example.com/reset?token=123456',
        'Test User'
    )
    .then(res => console.log('RESULT:', res))
    .catch(err => console.error('ERROR:', err));
