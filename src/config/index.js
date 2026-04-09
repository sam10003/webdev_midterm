const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  appMode: process.env.APP_MODE || "test",
  wipeDbOnBoot: process.env.WIPE_DB_ON_BOOT === "true",
  jwtExpiry: "15m",
  jwtRefreshExpiry: "7d",
};

export default config;
