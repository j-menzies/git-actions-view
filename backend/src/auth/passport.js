const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const config = require('../config');

function setupPassport(app) {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  if (config.isOAuth2Enabled) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.githubOAuth2ClientId,
          clientSecret: config.githubOAuth2ClientSecret,
          callbackURL: '/auth/github/callback',
          scope: ['read:user', 'repo'],
        },
        (accessToken, refreshToken, profile, done) => {
          const user = {
            accessToken,
            refreshToken,
            login: profile.username,
            name: profile.displayName || profile.username,
            avatarUrl: profile.photos?.[0]?.value || '',
          };
          done(null, user);
        }
      )
    );
  }

  app.use(passport.initialize());
  app.use(passport.session());
}

module.exports = { setupPassport };
