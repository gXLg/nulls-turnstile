const axios = require("axios");
const { optparser } = require("gxlg-utils");

const parser = optparser([
  { "name": "site",   "types": [""],         "required": true },
  { "name": "secret", "types": [""],         "required": true },
  { "name": "size",   "types": ["flexible"],                  },
  { "name": "ignore", "types": [false]                        }
]);

module.exports = (opt = {}) => {
  const options = parser(opt);

  const request = req => {
    if (req.method == "POST" && req.body != null) {
      req.verifyHuman = async expect => {
        if (options.ignore) return true;
        const response = req.body["turnstile-response"];
        if (!code) return false;
        const r = await axios.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          "secret": options.secret, response
        });
        return r.data.success && r.data.action == expect;
      };
    }
  };

  const processor = (html, req) => {
    const ts = html("[null-turnstile]");
    for (let i = 0; i < ts.length; i++) {
      const t = ts.eq(i);
      t.addClass("cf-turnstile");
      t.attr("data-sitekey", options.site);
      t.attr("data-size", options.size);
      t.attr("data-response-field-name", "turnstile-response");
      const action = t.attr("null-turnstile");
      t.attr("null-turnstile", null);
      t.attr("data-action", action);
      req.hasTurnstile = true;
    }
    if (html("head").length && req.hasTurnstile) {
      html("head").append(`
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
      `);
      html("body").append(`
        <script> turnstile.render(".cf-turnstile"); </script>
      `);
    }
  };

  return options => {
    const prevHook = options.hook;
    options.hook = async (req, res) => {
      request(req);
      await prevHook(req, res);
    };

    const prevProc = options.preprocessor;
    options.preprocessor = async (html, req, res) => {
      await prevProc(html, req, res);
      processor(html, req);
    };
  };

};
