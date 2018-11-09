function createEmbedElement(src, options) {
      options = options || { redirectURIs: ["/"] };
      function monkey(subject, name, callback) {
        subject["super_"+name] = subject[name];
        subject[name] = callback;
      }
      function absoluteURI(uri) {
        if (!uri) return uri;
        var a = document.createElement("a");
        a.href = uri;
        return a.href;
      }
      function parseURIBase(uri) {
        return absoluteURI(uri).replace(/\/[^\/]*\.html.*/, "").replace(/\?.*/, "").replace(/\#.*/, "");
      }
      var documentBase = parseURIBase(document.baseURI || document.URL);
      var elementBase = parseURIBase(src);
      function modifyURI(uri) {
        var output = uri;
        for (var i = 0, l = options.redirectURIs.length; i < l; i++) {
          var name = options.redirectURIs[i];
          if (uri.indexOf(name) == -1) continue;
          output = uri.replace(documentBase, elementBase);
          break;
        }
        return output;
      }
      function modifyNode(childNode, replaceScripts) {
        if (childNode.nodeName === "SCRIPT" && childNode.parentNode) {
          var src = modifyURI(absoluteURI(childNode.src));
          if (childNode.src === src) return;
          // repace script entirely if it needs a differnt src
          var script = document.createElement("script");
          script.async = false;
          script.type = "text/javascript";
          childNode.parentNode.replaceChild(script, childNode);
          script.src = src;
          return;
        }
        var src = childNode.getAttribute("src");
        if (src) {
          childNode.setAttribute("src", modifyURI(absoluteURI(src)));
        }
        var href = childNode.getAttribute("href");
        if (href) {
          childNode.setAttribute("href", modifyURI(absoluteURI(href)));
        }
        var poster = childNode.getAttribute("poster");
        if (poster) {
          childNode.setAttribute("poster", modifyURI(absoluteURI(poster)));
        }
      }
      function modifyNodes(parentNode, replaceScripts) {
         if (parentNode.nodeType !== 1) return;
        var childrenList = parentNode.querySelectorAll("[href],[src],[poster]");
        var children = Array.prototype.map.call(childrenList, function(child) { return child;});
        var nodes = [parentNode].concat(children).filter(function(element) {
          if (element.nodeType !== 1) return;
          return element.msMatchesSelector ? element.msMatchesSelector("[href],[src],[poster]") : element.matches("[href],[src],[poster]");
        });
        var rtn = null;
        nodes.forEach(function(childNode) {
          rtn = modifyNode(childNode, replaceScripts);
        });
        return rtn;
      }
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          switch (mutation.type) {
            case "childList":
              if (!mutation.addedNodes || !mutation.addedNodes.length) return;
              var nodes = Array.prototype.slice.call(mutation.addedNodes, 0);
              nodes.forEach(function(parentNode) {
                if (parentNode.nodeType !== 1) return;
                modifyNodes(parentNode);
              });
              break;
            case "attributes":
              if (mutation.attributeName !== "href" && mutation.attributeName !== "src") return;
              modifyNodes(mutation.target);
              break;
          }
        });
        observer.takeRecords();
      });
      observer.observe(document, { attributes: true, childList: true,  subtree: true });
      monkey(XMLHttpRequest.prototype, "open", function() {
        var args = Array.prototype.slice.call(arguments, 0);
        args[1] = modifyURI(absoluteURI(args[1]));
        return this.super_open.apply(this, args);
      });
      monkey(Element.prototype, "appendChild", function(childNode) {
        modifyNodes(childNode);
        return this.super_appendChild.apply(this, arguments);
      });
      monkey(Element.prototype, "insertBefore", function(childNode) {
        modifyNodes(childNode);
        return this.super_insertBefore.apply(this, arguments);
      });
      monkey(Element.prototype, "prepend", function(childNode) {
        modifyNodes(childNode);
        return this.super_prepend.apply(this, arguments);
      });
      var seat = document.createElement("div");
      var request = new XMLHttpRequest();
      request.addEventListener("load", function() {
        seat.innerHTML = this.responseText;
      });
      request.open("GET", src);
      request.send();
      return seat;
    }

    var embed = createEmbedElement("../sco/index.html", {
      redirectURIs: [
        "offline_API_wrapper.js",
        "adapt.css",
        "libraries/",
        "adapt/js/",
        "course/",
        "templates.js"
      ]
    });
