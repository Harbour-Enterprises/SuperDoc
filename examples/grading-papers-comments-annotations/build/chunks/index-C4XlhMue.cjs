"use strict";
const jszip = require("./jszip-CP5d3NU1.cjs");
const vue = require("./vue-CenuKwdP.cjs");
const xmlJs = require("./xml-js-Dzu8Vfx6.cjs");
const url = require("./url-Bsh5UqAB.cjs");
var streamHttp = {};
var request = { exports: {} };
var capability = {};
var hasRequiredCapability;
function requireCapability() {
  if (hasRequiredCapability) return capability;
  hasRequiredCapability = 1;
  (function(exports2) {
    exports2.fetch = isFunction(jszip.commonjsGlobal.fetch) && isFunction(jszip.commonjsGlobal.ReadableStream);
    exports2.writableStream = isFunction(jszip.commonjsGlobal.WritableStream);
    exports2.abortController = isFunction(jszip.commonjsGlobal.AbortController);
    var xhr;
    function getXHR() {
      if (xhr !== void 0) return xhr;
      if (jszip.commonjsGlobal.XMLHttpRequest) {
        xhr = new jszip.commonjsGlobal.XMLHttpRequest();
        try {
          xhr.open("GET", jszip.commonjsGlobal.XDomainRequest ? "/" : "https://example.com");
        } catch (e) {
          xhr = null;
        }
      } else {
        xhr = null;
      }
      return xhr;
    }
    function checkTypeSupport(type) {
      var xhr2 = getXHR();
      if (!xhr2) return false;
      try {
        xhr2.responseType = type;
        return xhr2.responseType === type;
      } catch (e) {
      }
      return false;
    }
    exports2.arraybuffer = exports2.fetch || checkTypeSupport("arraybuffer");
    exports2.msstream = !exports2.fetch && checkTypeSupport("ms-stream");
    exports2.mozchunkedarraybuffer = !exports2.fetch && checkTypeSupport("moz-chunked-arraybuffer");
    exports2.overrideMimeType = exports2.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false);
    function isFunction(value) {
      return typeof value === "function";
    }
    xhr = null;
  })(capability);
  return capability;
}
var response = {};
var readableBrowser = { exports: {} };
var hasRequiredReadableBrowser;
function requireReadableBrowser() {
  if (hasRequiredReadableBrowser) return readableBrowser.exports;
  hasRequiredReadableBrowser = 1;
  (function(module2, exports2) {
    exports2 = module2.exports = xmlJs.require_stream_readable();
    exports2.Stream = exports2;
    exports2.Readable = exports2;
    exports2.Writable = xmlJs.require_stream_writable();
    exports2.Duplex = xmlJs.require_stream_duplex();
    exports2.Transform = xmlJs.require_stream_transform();
    exports2.PassThrough = xmlJs.require_stream_passthrough();
    exports2.finished = xmlJs.requireEndOfStream();
    exports2.pipeline = xmlJs.requirePipeline();
  })(readableBrowser, readableBrowser.exports);
  return readableBrowser.exports;
}
var hasRequiredResponse;
function requireResponse() {
  if (hasRequiredResponse) return response;
  hasRequiredResponse = 1;
  var capability2 = requireCapability();
  var inherits = xmlJs.requireInherits_browser();
  var stream = requireReadableBrowser();
  var rStates = response.readyStates = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
  };
  var IncomingMessage = response.IncomingMessage = function(xhr, response2, mode, resetTimers) {
    var self = this;
    stream.Readable.call(self);
    self._mode = mode;
    self.headers = {};
    self.rawHeaders = [];
    self.trailers = {};
    self.rawTrailers = [];
    self.on("end", function() {
      vue.process$1.nextTick(function() {
        self.emit("close");
      });
    });
    if (mode === "fetch") {
      let read = function() {
        reader.read().then(function(result) {
          if (self._destroyed)
            return;
          resetTimers(result.done);
          if (result.done) {
            self.push(null);
            return;
          }
          self.push(jszip.Buffer.from(result.value));
          read();
        }).catch(function(err) {
          resetTimers(true);
          if (!self._destroyed)
            self.emit("error", err);
        });
      };
      self._fetchResponse = response2;
      self.url = response2.url;
      self.statusCode = response2.status;
      self.statusMessage = response2.statusText;
      response2.headers.forEach(function(header, key) {
        self.headers[key.toLowerCase()] = header;
        self.rawHeaders.push(key, header);
      });
      if (capability2.writableStream) {
        var writable = new WritableStream({
          write: function(chunk) {
            resetTimers(false);
            return new Promise(function(resolve, reject) {
              if (self._destroyed) {
                reject();
              } else if (self.push(jszip.Buffer.from(chunk))) {
                resolve();
              } else {
                self._resumeFetch = resolve;
              }
            });
          },
          close: function() {
            resetTimers(true);
            if (!self._destroyed)
              self.push(null);
          },
          abort: function(err) {
            resetTimers(true);
            if (!self._destroyed)
              self.emit("error", err);
          }
        });
        try {
          response2.body.pipeTo(writable).catch(function(err) {
            resetTimers(true);
            if (!self._destroyed)
              self.emit("error", err);
          });
          return;
        } catch (e) {
        }
      }
      var reader = response2.body.getReader();
      read();
    } else {
      self._xhr = xhr;
      self._pos = 0;
      self.url = xhr.responseURL;
      self.statusCode = xhr.status;
      self.statusMessage = xhr.statusText;
      var headers = xhr.getAllResponseHeaders().split(/\r?\n/);
      headers.forEach(function(header) {
        var matches = header.match(/^([^:]+):\s*(.*)/);
        if (matches) {
          var key = matches[1].toLowerCase();
          if (key === "set-cookie") {
            if (self.headers[key] === void 0) {
              self.headers[key] = [];
            }
            self.headers[key].push(matches[2]);
          } else if (self.headers[key] !== void 0) {
            self.headers[key] += ", " + matches[2];
          } else {
            self.headers[key] = matches[2];
          }
          self.rawHeaders.push(matches[1], matches[2]);
        }
      });
      self._charset = "x-user-defined";
      if (!capability2.overrideMimeType) {
        var mimeType = self.rawHeaders["mime-type"];
        if (mimeType) {
          var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/);
          if (charsetMatch) {
            self._charset = charsetMatch[1].toLowerCase();
          }
        }
        if (!self._charset)
          self._charset = "utf-8";
      }
    }
  };
  inherits(IncomingMessage, stream.Readable);
  IncomingMessage.prototype._read = function() {
    var self = this;
    var resolve = self._resumeFetch;
    if (resolve) {
      self._resumeFetch = null;
      resolve();
    }
  };
  IncomingMessage.prototype._onXHRProgress = function(resetTimers) {
    var self = this;
    var xhr = self._xhr;
    var response2 = null;
    switch (self._mode) {
      case "text":
        response2 = xhr.responseText;
        if (response2.length > self._pos) {
          var newData = response2.substr(self._pos);
          if (self._charset === "x-user-defined") {
            var buffer = jszip.Buffer.alloc(newData.length);
            for (var i = 0; i < newData.length; i++)
              buffer[i] = newData.charCodeAt(i) & 255;
            self.push(buffer);
          } else {
            self.push(newData, self._charset);
          }
          self._pos = response2.length;
        }
        break;
      case "arraybuffer":
        if (xhr.readyState !== rStates.DONE || !xhr.response)
          break;
        response2 = xhr.response;
        self.push(jszip.Buffer.from(new Uint8Array(response2)));
        break;
      case "moz-chunked-arraybuffer":
        response2 = xhr.response;
        if (xhr.readyState !== rStates.LOADING || !response2)
          break;
        self.push(jszip.Buffer.from(new Uint8Array(response2)));
        break;
      case "ms-stream":
        response2 = xhr.response;
        if (xhr.readyState !== rStates.LOADING)
          break;
        var reader = new jszip.commonjsGlobal.MSStreamReader();
        reader.onprogress = function() {
          if (reader.result.byteLength > self._pos) {
            self.push(jszip.Buffer.from(new Uint8Array(reader.result.slice(self._pos))));
            self._pos = reader.result.byteLength;
          }
        };
        reader.onload = function() {
          resetTimers(true);
          self.push(null);
        };
        reader.readAsArrayBuffer(response2);
        break;
    }
    if (self._xhr.readyState === rStates.DONE && self._mode !== "ms-stream") {
      resetTimers(true);
      self.push(null);
    }
  };
  return response;
}
var hasRequiredRequest;
function requireRequest() {
  if (hasRequiredRequest) return request.exports;
  hasRequiredRequest = 1;
  var capability2 = requireCapability();
  var inherits = xmlJs.requireInherits_browser();
  var response2 = requireResponse();
  var stream = requireReadableBrowser();
  var IncomingMessage = response2.IncomingMessage;
  var rStates = response2.readyStates;
  function decideMode(preferBinary, useFetch) {
    if (capability2.fetch && useFetch) {
      return "fetch";
    } else if (capability2.mozchunkedarraybuffer) {
      return "moz-chunked-arraybuffer";
    } else if (capability2.msstream) {
      return "ms-stream";
    } else if (capability2.arraybuffer && preferBinary) {
      return "arraybuffer";
    } else {
      return "text";
    }
  }
  var ClientRequest = request.exports = function(opts) {
    var self = this;
    stream.Writable.call(self);
    self._opts = opts;
    self._body = [];
    self._headers = {};
    if (opts.auth)
      self.setHeader("Authorization", "Basic " + jszip.Buffer.from(opts.auth).toString("base64"));
    Object.keys(opts.headers).forEach(function(name) {
      self.setHeader(name, opts.headers[name]);
    });
    var preferBinary;
    var useFetch = true;
    if (opts.mode === "disable-fetch" || "requestTimeout" in opts && !capability2.abortController) {
      useFetch = false;
      preferBinary = true;
    } else if (opts.mode === "prefer-streaming") {
      preferBinary = false;
    } else if (opts.mode === "allow-wrong-content-type") {
      preferBinary = !capability2.overrideMimeType;
    } else if (!opts.mode || opts.mode === "default" || opts.mode === "prefer-fast") {
      preferBinary = true;
    } else {
      throw new Error("Invalid value for opts.mode");
    }
    self._mode = decideMode(preferBinary, useFetch);
    self._fetchTimer = null;
    self._socketTimeout = null;
    self._socketTimer = null;
    self.on("finish", function() {
      self._onFinish();
    });
  };
  inherits(ClientRequest, stream.Writable);
  ClientRequest.prototype.setHeader = function(name, value) {
    var self = this;
    var lowerName = name.toLowerCase();
    if (unsafeHeaders.indexOf(lowerName) !== -1)
      return;
    self._headers[lowerName] = {
      name,
      value
    };
  };
  ClientRequest.prototype.getHeader = function(name) {
    var header = this._headers[name.toLowerCase()];
    if (header)
      return header.value;
    return null;
  };
  ClientRequest.prototype.removeHeader = function(name) {
    var self = this;
    delete self._headers[name.toLowerCase()];
  };
  ClientRequest.prototype._onFinish = function() {
    var self = this;
    if (self._destroyed)
      return;
    var opts = self._opts;
    if ("timeout" in opts && opts.timeout !== 0) {
      self.setTimeout(opts.timeout);
    }
    var headersObj = self._headers;
    var body = null;
    if (opts.method !== "GET" && opts.method !== "HEAD") {
      body = new Blob(self._body, {
        type: (headersObj["content-type"] || {}).value || ""
      });
    }
    var headersList = [];
    Object.keys(headersObj).forEach(function(keyName) {
      var name = headersObj[keyName].name;
      var value = headersObj[keyName].value;
      if (Array.isArray(value)) {
        value.forEach(function(v) {
          headersList.push([name, v]);
        });
      } else {
        headersList.push([name, value]);
      }
    });
    if (self._mode === "fetch") {
      var signal = null;
      if (capability2.abortController) {
        var controller = new AbortController();
        signal = controller.signal;
        self._fetchAbortController = controller;
        if ("requestTimeout" in opts && opts.requestTimeout !== 0) {
          self._fetchTimer = jszip.commonjsGlobal.setTimeout(function() {
            self.emit("requestTimeout");
            if (self._fetchAbortController)
              self._fetchAbortController.abort();
          }, opts.requestTimeout);
        }
      }
      jszip.commonjsGlobal.fetch(self._opts.url, {
        method: self._opts.method,
        headers: headersList,
        body: body || void 0,
        mode: "cors",
        credentials: opts.withCredentials ? "include" : "same-origin",
        signal
      }).then(function(response3) {
        self._fetchResponse = response3;
        self._resetTimers(false);
        self._connect();
      }, function(reason) {
        self._resetTimers(true);
        if (!self._destroyed)
          self.emit("error", reason);
      });
    } else {
      var xhr = self._xhr = new jszip.commonjsGlobal.XMLHttpRequest();
      try {
        xhr.open(self._opts.method, self._opts.url, true);
      } catch (err) {
        vue.process$1.nextTick(function() {
          self.emit("error", err);
        });
        return;
      }
      if ("responseType" in xhr)
        xhr.responseType = self._mode;
      if ("withCredentials" in xhr)
        xhr.withCredentials = !!opts.withCredentials;
      if (self._mode === "text" && "overrideMimeType" in xhr)
        xhr.overrideMimeType("text/plain; charset=x-user-defined");
      if ("requestTimeout" in opts) {
        xhr.timeout = opts.requestTimeout;
        xhr.ontimeout = function() {
          self.emit("requestTimeout");
        };
      }
      headersList.forEach(function(header) {
        xhr.setRequestHeader(header[0], header[1]);
      });
      self._response = null;
      xhr.onreadystatechange = function() {
        switch (xhr.readyState) {
          case rStates.LOADING:
          case rStates.DONE:
            self._onXHRProgress();
            break;
        }
      };
      if (self._mode === "moz-chunked-arraybuffer") {
        xhr.onprogress = function() {
          self._onXHRProgress();
        };
      }
      xhr.onerror = function() {
        if (self._destroyed)
          return;
        self._resetTimers(true);
        self.emit("error", new Error("XHR error"));
      };
      try {
        xhr.send(body);
      } catch (err) {
        vue.process$1.nextTick(function() {
          self.emit("error", err);
        });
        return;
      }
    }
  };
  function statusValid(xhr) {
    try {
      var status = xhr.status;
      return status !== null && status !== 0;
    } catch (e) {
      return false;
    }
  }
  ClientRequest.prototype._onXHRProgress = function() {
    var self = this;
    self._resetTimers(false);
    if (!statusValid(self._xhr) || self._destroyed)
      return;
    if (!self._response)
      self._connect();
    self._response._onXHRProgress(self._resetTimers.bind(self));
  };
  ClientRequest.prototype._connect = function() {
    var self = this;
    if (self._destroyed)
      return;
    self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode, self._resetTimers.bind(self));
    self._response.on("error", function(err) {
      self.emit("error", err);
    });
    self.emit("response", self._response);
  };
  ClientRequest.prototype._write = function(chunk, encoding, cb) {
    var self = this;
    self._body.push(chunk);
    cb();
  };
  ClientRequest.prototype._resetTimers = function(done) {
    var self = this;
    jszip.commonjsGlobal.clearTimeout(self._socketTimer);
    self._socketTimer = null;
    if (done) {
      jszip.commonjsGlobal.clearTimeout(self._fetchTimer);
      self._fetchTimer = null;
    } else if (self._socketTimeout) {
      self._socketTimer = jszip.commonjsGlobal.setTimeout(function() {
        self.emit("timeout");
      }, self._socketTimeout);
    }
  };
  ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function(err) {
    var self = this;
    self._destroyed = true;
    self._resetTimers(true);
    if (self._response)
      self._response._destroyed = true;
    if (self._xhr)
      self._xhr.abort();
    else if (self._fetchAbortController)
      self._fetchAbortController.abort();
    if (err)
      self.emit("error", err);
  };
  ClientRequest.prototype.end = function(data, encoding, cb) {
    var self = this;
    if (typeof data === "function") {
      cb = data;
      data = void 0;
    }
    stream.Writable.prototype.end.call(self, data, encoding, cb);
  };
  ClientRequest.prototype.setTimeout = function(timeout, cb) {
    var self = this;
    if (cb)
      self.once("timeout", cb);
    self._socketTimeout = timeout;
    self._resetTimers(false);
  };
  ClientRequest.prototype.flushHeaders = function() {
  };
  ClientRequest.prototype.setNoDelay = function() {
  };
  ClientRequest.prototype.setSocketKeepAlive = function() {
  };
  var unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "date",
    "dnt",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "via"
  ];
  return request.exports;
}
var immutable;
var hasRequiredImmutable;
function requireImmutable() {
  if (hasRequiredImmutable) return immutable;
  hasRequiredImmutable = 1;
  immutable = extend;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function extend() {
    var target = {};
    for (var i = 0; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }
  return immutable;
}
var browser;
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser;
  hasRequiredBrowser = 1;
  browser = {
    "100": "Continue",
    "101": "Switching Protocols",
    "102": "Processing",
    "200": "OK",
    "201": "Created",
    "202": "Accepted",
    "203": "Non-Authoritative Information",
    "204": "No Content",
    "205": "Reset Content",
    "206": "Partial Content",
    "207": "Multi-Status",
    "208": "Already Reported",
    "226": "IM Used",
    "300": "Multiple Choices",
    "301": "Moved Permanently",
    "302": "Found",
    "303": "See Other",
    "304": "Not Modified",
    "305": "Use Proxy",
    "307": "Temporary Redirect",
    "308": "Permanent Redirect",
    "400": "Bad Request",
    "401": "Unauthorized",
    "402": "Payment Required",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "406": "Not Acceptable",
    "407": "Proxy Authentication Required",
    "408": "Request Timeout",
    "409": "Conflict",
    "410": "Gone",
    "411": "Length Required",
    "412": "Precondition Failed",
    "413": "Payload Too Large",
    "414": "URI Too Long",
    "415": "Unsupported Media Type",
    "416": "Range Not Satisfiable",
    "417": "Expectation Failed",
    "418": "I'm a teapot",
    "421": "Misdirected Request",
    "422": "Unprocessable Entity",
    "423": "Locked",
    "424": "Failed Dependency",
    "425": "Unordered Collection",
    "426": "Upgrade Required",
    "428": "Precondition Required",
    "429": "Too Many Requests",
    "431": "Request Header Fields Too Large",
    "451": "Unavailable For Legal Reasons",
    "500": "Internal Server Error",
    "501": "Not Implemented",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
    "504": "Gateway Timeout",
    "505": "HTTP Version Not Supported",
    "506": "Variant Also Negotiates",
    "507": "Insufficient Storage",
    "508": "Loop Detected",
    "509": "Bandwidth Limit Exceeded",
    "510": "Not Extended",
    "511": "Network Authentication Required"
  };
  return browser;
}
const require$$1 = /* @__PURE__ */ jszip.getAugmentedNamespace(url.url);
var hasRequiredStreamHttp;
function requireStreamHttp() {
  if (hasRequiredStreamHttp) return streamHttp;
  hasRequiredStreamHttp = 1;
  (function(exports2) {
    var ClientRequest = requireRequest();
    var response2 = requireResponse();
    var extend = requireImmutable();
    var statusCodes = requireBrowser();
    var url2 = require$$1;
    var http = exports2;
    http.request = function(opts, cb) {
      if (typeof opts === "string")
        opts = url2.parse(opts);
      else
        opts = extend(opts);
      var defaultProtocol = jszip.commonjsGlobal.location.protocol.search(/^https?:$/) === -1 ? "http:" : "";
      var protocol = opts.protocol || defaultProtocol;
      var host = opts.hostname || opts.host;
      var port = opts.port;
      var path = opts.path || "/";
      if (host && host.indexOf(":") !== -1)
        host = "[" + host + "]";
      opts.url = (host ? protocol + "//" + host : "") + (port ? ":" + port : "") + path;
      opts.method = (opts.method || "GET").toUpperCase();
      opts.headers = opts.headers || {};
      var req = new ClientRequest(opts);
      if (cb)
        req.on("response", cb);
      return req;
    };
    http.get = function get(opts, cb) {
      var req = http.request(opts, cb);
      req.end();
      return req;
    };
    http.ClientRequest = ClientRequest;
    http.IncomingMessage = response2.IncomingMessage;
    http.Agent = function() {
    };
    http.Agent.defaultMaxSockets = 4;
    http.globalAgent = new http.Agent();
    http.STATUS_CODES = statusCodes;
    http.METHODS = [
      "CHECKOUT",
      "CONNECT",
      "COPY",
      "DELETE",
      "GET",
      "HEAD",
      "LOCK",
      "M-SEARCH",
      "MERGE",
      "MKACTIVITY",
      "MKCOL",
      "MOVE",
      "NOTIFY",
      "OPTIONS",
      "PATCH",
      "POST",
      "PROPFIND",
      "PROPPATCH",
      "PURGE",
      "PUT",
      "REPORT",
      "SEARCH",
      "SUBSCRIBE",
      "TRACE",
      "UNLOCK",
      "UNSUBSCRIBE"
    ];
  })(streamHttp);
  return streamHttp;
}
exports.require$$1 = require$$1;
exports.requireStreamHttp = requireStreamHttp;
