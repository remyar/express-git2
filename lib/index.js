// Generated by CoffeeScript 1.12.7
(function() {
  var EXPRESS_GIT_DEFAULTS, PORT, Promise, ROOT, RepoManager, _path, a2o, app, assign, express, expressGit, freeze, git, httpify, mkdir, os, ref, ref1, spawn, test;

  ref = require("./helpers"), httpify = ref.httpify, a2o = ref.a2o, spawn = ref.spawn, assign = ref.assign, freeze = ref.freeze;

  Promise = require("bluebird");

  ref1 = require("shelljs"), mkdir = ref1.mkdir, test = ref1.test;

  express = require("./express");

  _path = require("path");

  module.exports = expressGit = {};

  expressGit.git = git = require("./ezgit");

  expressGit.services = require("./services");

  RepoManager = require("./repo-manager");

  EXPRESS_GIT_DEFAULTS = {
    git_http_backend: true,
    serve_static: true,
    accept_commits: true,
    refs: true,
    auto_init: true,
    browse: true,
    init_options: {},
    max_size: 2 * 1024,
    max_age: 365 * 24 * 60 * 60,
    pattern: /.*/,
    authorize: null
  };

  expressGit.serve = function(root, options) {
    var BadRequestError, GIT_AUTH, GIT_INIT_OPTIONS, GIT_PROJECT_ROOT, NonHttpError, NotFoundError, REPO_MANAGER_OPTIONS, UnauthorizedError, app, ref2;
    options = assign({}, EXPRESS_GIT_DEFAULTS, options);
    if (!(options.pattern instanceof RegExp)) {
      options.pattern = new Regexp("" + (options.pattern || '.*'));
    }
    GIT_AUTH = typeof options.authorize === "function" ? options.authorize : function(name, req, next) {
      return next();
    };
    GIT_PROJECT_ROOT = _path.resolve("" + root);
    GIT_INIT_OPTIONS = freeze(options.init_options);
    app = express();
    app.project_root = GIT_PROJECT_ROOT;
    app.git = git;
    ref2 = app.errors = require("./errors"), NonHttpError = ref2.NonHttpError, NotFoundError = ref2.NotFoundError, BadRequestError = ref2.BadRequestError, UnauthorizedError = ref2.UnauthorizedError;
    app.disable("etag");
    app.authorize = function(name) {
      return function(req, res, next) {
        return GIT_AUTH(name, req, function(err) {
          if (err != null) {
            if (err.status == null) {
              err.status = 401;
            }
          }
          return next(err);
        });
      };
    };
    app.cacheHeaders = function(object) {
      return {
        "Etag": "" + (object.id()),
        "Cache-Control": "private, max-age=" + options.max_age + ", no-transform, must-revalidate"
      };
    };
    REPO_MANAGER_OPTIONS = {
      pattern: options.pattern,
      auto_init: options.auto_init,
      init_options: GIT_INIT_OPTIONS
    };
    app.use(function(req, res, next) {
      var NODEGIT_OBJECTS, disposable, repositories;
      NODEGIT_OBJECTS = [];
      disposable = function(value) {
        NODEGIT_OBJECTS.push(Promise.resolve(value));
        return value;
      };
      repositories = new RepoManager(GIT_PROJECT_ROOT, NODEGIT_OBJECTS, REPO_MANAGER_OPTIONS);
      repositories.emit = app.emit.bind(app);
      req.git = freeze(req.git, {
        repositories: repositories,
        disposable: disposable,
        NODEGIT_OBJECTS: NODEGIT_OBJECTS
      });
      return next();
    });
    app.param("git_repo", function(req, res, next, path) {
      var err, git_dir, name, params, ref3;
      try {
        ref3 = req.git.repositories.parse(path), name = ref3[0], params = ref3[1], git_dir = ref3[2];
      } catch (error) {
        err = error;
        if (err.status == null) {
          err.status = 400;
        }
        return next(err);
      }
      req.git_repo = {
        name: name,
        params: params,
        git_dir: git_dir
      };
      return next();
    });
    if (options.browse) {
      expressGit.services.browse(app, options);
      expressGit.services.object(app, options);
    }
    if (options.accept_commits) {
      expressGit.services.commit(app, options);
    }
    if (options.serve_static) {
      expressGit.services.raw(app, options);
    }
    if (options.git_http_backend) {
      expressGit.services.git_http_backend(app, options);
    }
    if (options.refs) {
      expressGit.services.refs(app, options);
    }
    app.use(function(req, res, next) {
      return Promise.settle(req.git.NODEGIT_OBJECTS).map(function(inspection) {
        var ref3;
        if (inspection.isFulfilled()) {
          try {
            return (ref3 = inspection.value()) != null ? ref3.free() : void 0;
          } catch (error) {}
        }
      });
    });
    return app;
  };

  if (require.main === module) {
    os = require("os");
    PORT = process.env.PORT;
    ROOT = process.argv[2] || process.env.GIT_PROJECT_ROOT;
    if (ROOT == null) {
      ROOT = _path.join(os.tmpdir(), "express-git-repos");
    }
    mkdir(ROOT);
    if (PORT == null) {
      PORT = 20000 + (new Date().getTime() % 10000) | 0;
    }
    app = expressGit.serve(ROOT, {});
    app.listen(PORT, function() {
      console.log("Listening on " + PORT);
      return console.log("Serving repos from " + (_path.resolve(ROOT)));
    });
  }

}).call(this);


