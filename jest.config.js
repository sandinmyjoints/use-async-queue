module.exports = {
  testEnvironment: "jsdom",
  watchPathIgnorePatterns: ["<rootDir>/dist/"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
};
