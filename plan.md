1. **Fix Identity Spoofing in `app.post("/*")`**:
   - Update `app.post("/*")` in `server.ts` to reset `req.headers['x-ivc-user']` to `'anonymous'` if the channel does not start with a protected routing symbol (`+`, `-`, `#`, `@`, `$`, `§`, `∆`, `~`, `£`).
2. **Add `£` to ZTCIE middleware and Perceived Location header**:
   - Update the ZTCIE middleware in `server.ts` to also intercept paths starting with `/£`.
   - Update the Perceived Location header regex in `server.ts` to include `£`.
3. **Verify the Fix**:
   - Run a spoofing test to ensure `x-ivc-user` is reset on standard channels.
   - Run existing manual tests like `test_auth_bypass.js` to make sure we didn't break things.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit the PR**.
