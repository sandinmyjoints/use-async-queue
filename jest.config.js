module.exports = {
  testEnvironment: "jsdom",
  watchPathIgnorePatterns: ["<rootDir>/dist/"],
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
};
