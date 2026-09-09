const pool = require('../db/pool');

// Public, unauthenticated — the app calls this before login is even
// guaranteed (e.g. from the login screen) to know whether it's outdated.
const VERSION_CONFIG_KEYS = [
  'ios_latest_build', 'ios_update_url',
  'android_latest_build', 'android_update_url',
];

const checkVersion = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, value FROM config WHERE key = ANY($1)',
      [VERSION_CONFIG_KEYS]
    );
    const config = {};
    result.rows.forEach((row) => { config[row.key] = row.value; });

    res.json({
      ios: {
        latestBuild: parseInt(config.ios_latest_build, 10) || 0,
        updateUrl: config.ios_update_url || null,
      },
      android: {
        latestBuild: parseInt(config.android_latest_build, 10) || 0,
        updateUrl: config.android_update_url || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { checkVersion };
