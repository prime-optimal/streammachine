(function () {
  "use strict";

  var SRC_TAGS = { img: 1, video: 1, audio: 1, source: 1 };
  var params = new URLSearchParams(location.search);
  var specs = {};
  var values = {};

  try {
    JSON.parse(
      document.documentElement.getAttribute("data-composition-variables") ||
        "[]",
    ).forEach(function (spec) {
      specs[spec.id] = spec;
      values[spec.id] = spec.default;
    });
  } catch (error) {
    console.error("[overlay] invalid data-composition-variables", error);
  }

  function enumValues(spec) {
    return (spec.options || []).map(function (option) {
      return option !== null && typeof option === "object"
        ? option.value
        : option;
    });
  }

  function coerce(spec, value, fromUrl) {
    switch (spec.type) {
      case "color":
        return typeof value === "string" && CSS.supports("color", value)
          ? value
          : undefined;
      case "number": {
        var number = fromUrl ? Number(value) : value;
        return typeof number === "number" && isFinite(number)
          ? number
          : undefined;
      }
      case "boolean":
        if (typeof value === "boolean") return value;
        if (fromUrl && (value === "true" || value === "false"))
          return value === "true";
        return undefined;
      case "enum":
        return enumValues(spec).indexOf(value) >= 0 ? value : undefined;
      default:
        if (typeof value !== "string") return undefined;
        return spec.maxLength ? value.slice(0, spec.maxLength) : value;
    }
  }

  function set(id, value, fromUrl) {
    var spec = specs[id];
    if (!spec) return false;
    var next = coerce(spec, value, fromUrl);
    if (next === undefined) {
      console.warn("[overlay] ignoring invalid value for " + id, value);
      return false;
    }
    values[id] = next;
    return true;
  }

  Object.keys(specs).forEach(function (id) {
    if (params.has(id)) set(id, params.get(id), true);
  });

  window.__hyperframes = window.__hyperframes || {};
  window.__hyperframes.getVariables = function () {
    return Object.assign({}, values);
  };

  var root;

  function setText(element, text) {
    if (element.childElementCount === 0) {
      element.textContent = text;
      return;
    }
    var placed = false;
    Array.prototype.forEach.call(element.childNodes, function (node) {
      if (node.nodeType !== Node.TEXT_NODE) return;
      node.nodeValue = placed ? "" : text;
      placed = true;
    });
    if (!placed)
      element.insertBefore(document.createTextNode(text), element.firstChild);
  }

  function safeSrc(url) {
    var scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url);
    if (!scheme) return true;
    var name = scheme[1].toLowerCase();
    if (name === "data") return /^data:image\//i.test(url);
    return name === "https" || name === "http" || name === "blob";
  }

  function apply() {
    Object.keys(values).forEach(function (id) {
      var value = values[id];
      var css =
        value !== null && typeof value === "object" ? value.name : value;
      if (css !== undefined && css !== null)
        root.style.setProperty(
          "--" + id,
          String(css).replace(/[;{}<>\r\n]/g, ""),
        );
    });
    root.querySelectorAll("[data-var-text]").forEach(function (element) {
      var value = values[element.getAttribute("data-var-text").trim()];
      if (value !== undefined && value !== null && typeof value !== "object")
        setText(element, String(value));
    });
    root.querySelectorAll("[data-var-src]").forEach(function (element) {
      var value = values[element.getAttribute("data-var-src").trim()];
      var url = value !== null && typeof value === "object" ? value.url : value;
      if (
        typeof url === "string" &&
        url &&
        SRC_TAGS[element.localName] &&
        safeSrc(url)
      )
        element.setAttribute("src", url);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    root = document.querySelector("[data-composition-id]");
    var id = root && root.getAttribute("data-composition-id");
    var timeline = id && window.__timelines && window.__timelines[id];
    if (!timeline) {
      console.error("[overlay] no timeline registered for composition " + id);
      return;
    }
    apply();
    var duration = Number(root.getAttribute("data-duration"));
    if (duration > timeline.duration()) {
      timeline.to({}, { duration: duration - timeline.duration() });
    }
    timeline.repeat(params.get("loop") === "0" ? 0 : -1);

    window.overlay = {
      timeline: timeline,
      variables: window.__hyperframes.getVariables,
      update: function (patch) {
        var changed = Object.keys(patch || {}).filter(function (key) {
          return set(key, patch[key], false);
        });
        if (changed.length) apply();
        return changed;
      },
      replay: function () {
        timeline.play(0);
      },
      play: function () {
        timeline.play();
      },
      pause: function () {
        timeline.pause();
      },
    };

    document.fonts.ready.then(function () {
      timeline.play(0);
    });
  });
})();
