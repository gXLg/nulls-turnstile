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
    if (req.method == "POST") {
      req.verifyHuman = async expect => {
        if (options.ignore) return true;
        const response = req.body["turnstile-response"];
        if (!response) return false;
        const r = await axios.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          "secret": options.secret, response
        });
        return r.data.success && r.data.action == expect;
      };
    }
  };

  const processorSetup = html => {
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
    }
  };
  const processorRender = html => {
    if (html(".cf-turnstile").length) {
      html("head").append(`
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
      `);
      html("body").append(`
        <script> turnstile.render(".cf-turnstile"); </script>
      `);
    }
  };

  return noptions => {
    const prevHook = noptions.hook;
    noptions.hook = async (req, res) => {
      request(req);
      await prevHook(req, res);
    };

    const prevPreProc = noptions.preprocessor;
    noptions.preprocessor = async (html, req, res) => {
      await prevPreProc(html, req, res);
      processorSetup(html);
    };

    const prevPostProc = noptions.postprocessor;
    noptions.postprocessor = async (html, req, res) => {
      await prevPostProc(html, req, res);
      processorRender(html);
    };
  };

};
