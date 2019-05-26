//javascript/closure/base.js
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will attempt to load Closure's deps file, unless
 * the global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects
 * to include their own deps file(s) from different locations.
 *
 * Avoid including base.js more than once. This is strictly discouraged and not
 * supported. goog.require(...) won't work properly in that case.
 *
 * @provideGoog
 */


/**
 * @define {boolean} Overridden to true by the compiler.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is already
 * defined in the current scope before assigning to prevent clobbering if
 * base.js is loaded more than once.
 *
 * @const
 */
var goog = goog || {};


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
goog.global = this;


/**
 * A hook for overriding the define values in uncompiled mode.
 *
 * In uncompiled mode, `CLOSURE_UNCOMPILED_DEFINES` may be defined before
 * loading base.js.  If a key is defined in `CLOSURE_UNCOMPILED_DEFINES`,
 * `goog.define` will use the value instead of the default value.  This
 * allows flags to be overwritten without compilation (this is normally
 * accomplished with the compiler's "define" flag).
 *
 * Example:
 * <pre>
 *   var CLOSURE_UNCOMPILED_DEFINES = {'goog.DEBUG': false};
 * </pre>
 *
 * @type {Object<string, (string|number|boolean)>|undefined}
 */
goog.global.CLOSURE_UNCOMPILED_DEFINES;


/**
 * A hook for overriding the define values in uncompiled or compiled mode,
 * like CLOSURE_UNCOMPILED_DEFINES but effective in compiled code.  In
 * uncompiled code CLOSURE_UNCOMPILED_DEFINES takes precedence.
 *
 * Also unlike CLOSURE_UNCOMPILED_DEFINES the values must be number, boolean or
 * string literals or the compiler will emit an error.
 *
 * While any @define value may be set, only those set with goog.define will be
 * effective for uncompiled code.
 *
 * Example:
 * <pre>
 *   var CLOSURE_DEFINES = {'goog.DEBUG': false} ;
 * </pre>
 *
 * @type {Object<string, (string|number|boolean)>|undefined}
 */
goog.global.CLOSURE_DEFINES;


/**
 * Returns true if the specified value is not undefined.
 *
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  // void 0 always evaluates to undefined and hence we do not need to depend on
  // the definition of the global variable named 'undefined'.
  return val !== void 0;
};

/**
 * Returns true if the specified value is a string.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Builds an object structure for the provided namespace path, ensuring that
 * names that already exist are not overwritten. For example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is `goog.global`.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part] && cur[part] !== Object.prototype[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Defines a named value. In uncompiled mode, the value is retrieved from
 * CLOSURE_DEFINES or CLOSURE_UNCOMPILED_DEFINES if the object is defined and
 * has the property specified, and otherwise used the defined defaultValue.
 * When compiled the default can be overridden using the compiler
 * options or the value set in the CLOSURE_DEFINES object.
 *
 * @param {string} name The distinguished name to provide.
 * @param {string|number|boolean} defaultValue
 */
goog.define = function(name, defaultValue) {
  var value = defaultValue;
  if (!COMPILED) {
    var uncompiledDefines = goog.global.CLOSURE_UNCOMPILED_DEFINES;
    var defines = goog.global.CLOSURE_DEFINES;
    if (uncompiledDefines &&
        // Anti DOM-clobbering runtime check (b/37736576).
        /** @type {?} */ (uncompiledDefines).nodeType === undefined &&
        Object.prototype.hasOwnProperty.call(uncompiledDefines, name)) {
      value = uncompiledDefines[name];
    } else if (
        defines &&
        // Anti DOM-clobbering runtime check (b/37736576).
        /** @type {?} */ (defines).nodeType === undefined &&
        Object.prototype.hasOwnProperty.call(defines, name)) {
      value = defines[name];
    }
  }
  goog.exportPath_(name, value);
};


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production. It can be easily stripped
 * by specifying --define goog.DEBUG=false to the Closure Compiler aka
 * JSCompiler. For example, most toString() methods should be declared inside an
 * "if (goog.DEBUG)" conditional because they are generally used for debugging
 * purposes and it is difficult for the JSCompiler to statically determine
 * whether they are used.
 */
goog.define('goog.DEBUG', true);


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as a compiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he).
 *
 * MOE:begin_intracomment_strip
 * See http://g3doc/i18n/identifiers/g3doc/synonyms.
 * MOE:end_intracomment_strip
 */
goog.define('goog.LOCALE', 'en');  // default to en


/**
 * @define {boolean} Whether this code is running on trusted sites.
 *
 * On untrusted sites, several native functions can be defined or overridden by
 * external libraries like Prototype, Datejs, and JQuery and setting this flag
 * to false forces closure to use its own implementations when possible.
 *
 * If your JavaScript can be loaded by a third party site and you are wary about
 * relying on non-standard implementations, specify
 * "--define goog.TRUSTED_SITE=false" to the compiler.
 */
goog.define('goog.TRUSTED_SITE', true);


/**
 * @define {boolean} Whether a project is expected to be running in strict mode.
 *
 * This define can be used to trigger alternate implementations compatible with
 * running in EcmaScript Strict mode or warn about unavailable functionality.
 * @see https://goo.gl/PudQ4y
 *
 */
goog.define('goog.STRICT_MODE_COMPATIBLE', false);


/**
 * @define {boolean} Whether code that calls {@link goog.setTestOnly} should
 *     be disallowed in the compilation unit.
 */
goog.define('goog.DISALLOW_TEST_ONLY_CODE', COMPILED && !goog.DEBUG);


/**
 * @define {boolean} Whether to use a Chrome app CSP-compliant method for
 *     loading scripts via goog.require. @see appendScriptSrcNode_.
 */
goog.define('goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING', false);


/**
 * Defines a namespace in Closure.
 *
 * A namespace may only be defined once in a codebase. It may be defined using
 * goog.provide() or goog.module().
 *
 * The presence of one or more goog.provide() calls in a file indicates
 * that the file defines the given objects/namespaces.
 * Provided symbols must not be null or undefined.
 *
 * In addition, goog.provide() creates the object stubs for a namespace
 * (for example, goog.provide("goog.foo.bar") will create the object
 * goog.foo.bar if it does not already exist).
 *
 * Build tools also scan for provide/require/module statements
 * to discern dependencies, build dependency files (see deps.js), etc.
 *
 * @see goog.require
 * @see goog.module
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 */
goog.provide = function(name) {
  if (goog.isInModuleLoader_()) {
    throw new Error('goog.provide can not be used within a goog.module.');
  }
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice.
    // A goog.module/goog.provide maps a goog.require to a specific file
    if (goog.isProvided_(name)) {
      throw new Error('Namespace "' + name + '" already declared.');
    }
  }

  goog.constructNamespace_(name);
};


/**
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 * @param {Object=} opt_obj The object to embed in the namespace.
 * @private
 */
goog.constructNamespace_ = function(name, opt_obj) {
  if (!COMPILED) {
    delete goog.implicitNamespaces_[name];

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name, opt_obj);
};


/**
 * Module identifier validation regexp.
 * Note: This is a conservative check, it is very possible to be more lenient,
 *   the primary exclusion here is "/" and "\" and a leading ".", these
 *   restrictions are intended to leave the door open for using goog.require
 *   with relative file paths rather than module identifiers.
 * @private
 */
goog.VALID_MODULE_RE_ = /^[a-zA-Z_$][a-zA-Z0-9._$]*$/;


/**
 * Defines a module in Closure.
 *
 * Marks that this file must be loaded as a module and claims the namespace.
 *
 * A namespace may only be defined once in a codebase. It may be defined using
 * goog.provide() or goog.module().
 *
 * goog.module() has three requirements:
 * - goog.module may not be used in the same file as goog.provide.
 * - goog.module must be the first statement in the file.
 * - only one goog.module is allowed per file.
 *
 * When a goog.module annotated file is loaded, it is enclosed in
 * a strict function closure. This means that:
 * - any variables declared in a goog.module file are private to the file
 * (not global), though the compiler is expected to inline the module.
 * - The code must obey all the rules of "strict" JavaScript.
 * - the file will be marked as "use strict"
 *
 * NOTE: unlike goog.provide, goog.module does not declare any symbols by
 * itself. If declared symbols are desired, use
 * goog.module.declareLegacyNamespace().
 *
 * MOE:begin_intracomment_strip
 * See the goog.module announcement at http://go/goog.module-announce
 * MOE:end_intracomment_strip
 *
 * See the public goog.module proposal: http://goo.gl/Va1hin
 *
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part", is expected but not required.
 * @return {void}
 */
goog.module = function(name) {
  if (!goog.isString(name) || !name ||
      name.search(goog.VALID_MODULE_RE_) == -1) {
    throw new Error('Invalid module identifier');
  }
  if (!goog.isInModuleLoader_()) {
    throw new Error(
        'Module ' + name + ' has been loaded incorrectly. Note, ' +
        'modules cannot be loaded as normal scripts. They require some kind of ' +
        'pre-processing step. You\'re likely trying to load a module via a ' +
        'script tag or as a part of a concatenated bundle without rewriting the ' +
        'module. For more info see: ' +
        'https://github.com/google/closure-library/wiki/goog.module:-an-ES6-module-like-alternative-to-goog.provide.');
  }
  if (goog.moduleLoaderState_.moduleName) {
    throw new Error('goog.module may only be called once per module.');
  }

  // Store the module name for the loader.
  goog.moduleLoaderState_.moduleName = name;
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice.
    // A goog.module/goog.provide maps a goog.require to a specific file
    if (goog.isProvided_(name)) {
      throw new Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
  }
};


/**
 * @param {string} name The module identifier.
 * @return {?} The module exports for an already loaded module or null.
 *
 * Note: This is not an alternative to goog.require, it does not
 * indicate a hard dependency, instead it is used to indicate
 * an optional dependency or to access the exports of a module
 * that has already been loaded.
 * @suppress {missingProvide}
 */
goog.module.get = function(name) {
  return goog.module.getInternal_(name);
};


/**
 * @param {string} name The module identifier.
 * @return {?} The module exports for an already loaded module or null.
 * @private
 */
goog.module.getInternal_ = function(name) {
  if (!COMPILED) {
    if (name in goog.loadedModules_) {
      return goog.loadedModules_[name];
    } else if (!goog.implicitNamespaces_[name]) {
      var ns = goog.getObjectByName(name);
      return ns != null ? ns : null;
    }
  }
  return null;
};


/**
 * @private {?{moduleName: (string|undefined), declareLegacyNamespace:boolean}}
 */
goog.moduleLoaderState_ = null;


/**
 * @private
 * @return {boolean} Whether a goog.module is currently being initialized.
 */
goog.isInModuleLoader_ = function() {
  return goog.moduleLoaderState_ != null;
};


/**
 * Provide the module's exports as a globally accessible object under the
 * module's declared name.  This is intended to ease migration to goog.module
 * for files that have existing usages.
 * @suppress {missingProvide}
 */
goog.module.declareLegacyNamespace = function() {
  if (!COMPILED && !goog.isInModuleLoader_()) {
    throw new Error(
        'goog.module.declareLegacyNamespace must be called from ' +
        'within a goog.module');
  }
  if (!COMPILED && !goog.moduleLoaderState_.moduleName) {
    throw new Error(
        'goog.module must be called prior to ' +
        'goog.module.declareLegacyNamespace.');
  }
  goog.moduleLoaderState_.declareLegacyNamespace = true;
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 *
 * In the case of unit tests, the message may optionally be an exact namespace
 * for the test (e.g. 'goog.stringTest'). The linter will then ignore the extra
 * provide (if not explicitly defined in the code).
 *
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (goog.DISALLOW_TEST_ONLY_CODE) {
    opt_message = opt_message || '';
    throw new Error(
        'Importing test-only code into non-debug environment' +
        (opt_message ? ': ' + opt_message : '.'));
  }
};


/**
 * Forward declares a symbol. This is an indication to the compiler that the
 * symbol may be used in the source yet is not required and may not be provided
 * in compilation.
 *
 * The most common usage of forward declaration is code that takes a type as a
 * function parameter but does not need to require it. By forward declaring
 * instead of requiring, no hard dependency is made, and (if not required
 * elsewhere) the namespace may never be required and thus, not be pulled
 * into the JavaScript binary. If it is required elsewhere, it will be type
 * checked as normal.
 *
 * Before using goog.forwardDeclare, please read the documentation at
 * https://github.com/google/closure-compiler/wiki/Bad-Type-Annotation to
 * understand the options and tradeoffs when working with forward declarations.
 *
 * @param {string} name The namespace to forward declare in the form of
 *     "goog.package.part".
 */
goog.forwardDeclare = function(name) {};


/**
 * Forward declare type information. Used to assign types to goog.global
 * referenced object that would otherwise result in unknown type references
 * and thus block property disambiguation.
 */
goog.forwardDeclare('Document');
goog.forwardDeclare('HTMLScriptElement');
goog.forwardDeclare('XMLHttpRequest');


if (!COMPILED) {
  /**
   * Check if the given name has been goog.provided. This will return false for
   * names that are available only as implicit namespaces.
   * @param {string} name name of the object to look for.
   * @return {boolean} Whether the name has been provided.
   * @private
   */
  goog.isProvided_ = function(name) {
    return (name in goog.loadedModules_) ||
        (!goog.implicitNamespaces_[name] &&
         goog.isDefAndNotNull(goog.getObjectByName(name)));
  };

  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares that 'goog' and
   * 'goog.events' must be namespaces.
   *
   * @type {!Object<string, (boolean|undefined)>}
   * @private
   */
  goog.implicitNamespaces_ = {'goog.module': true};

  // NOTE: We add goog.module as an implicit namespace as goog.module is defined
  // here and because the existing module package has not been moved yet out of
  // the goog.module namespace. This satisifies both the debug loader and
  // ahead-of-time dependency management.
}


/**
 * Returns an object based on its fully qualified external name.  The object
 * is not found if null or undefined.  If you are using a compilation pass that
 * renames property names beware that using this function will not find renamed
 * properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {?} The value (object or primitive) or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var i = 0; i < parts.length; i++) {
    cur = cur[parts[i]];
    if (!goog.isDefAndNotNull(cur)) {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {!Object} obj The namespace to globalize.
 * @param {Object=} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {!Array<string>} provides An array of strings with
 *     the names of the objects this file provides.
 * @param {!Array<string>} requires An array of strings with
 *     the names of the objects this file requires.
 * @param {boolean|!Object<string>=} opt_loadFlags Parameters indicating
 *     how the file must be loaded.  The boolean 'true' is equivalent
 *     to {'module': 'goog'} for backwards-compatibility.  Valid properties
 *     and values include {'module': 'goog'} and {'lang': 'es6'}.
 */
goog.addDependency = function(relPath, provides, requires, opt_loadFlags) {
  if (goog.DEPENDENCIES_ENABLED) {
    var loader = goog.getLoader_();
    if (loader) {
      loader.addDependency(relPath, provides, requires, opt_loadFlags);
    }
  }
};


// MOE:begin_strip
/**
 * Whether goog.require should throw an exception if it fails.
 * @type {boolean}
 */
goog.useStrictRequires = false;


// MOE:end_strip


// NOTE(nnaze): The debug DOM loader was included in base.js as an original way
// to do "debug-mode" development.  The dependency system can sometimes be
// confusing, as can the debug DOM loader's asynchronous nature.
//
// With the DOM loader, a call to goog.require() is not blocking -- the script
// will not load until some point after the current script.  If a namespace is
// needed at runtime, it needs to be defined in a previous script, or loaded via
// require() with its registered dependencies.
//
// User-defined namespaces may need their own deps file. For a reference on
// creating a deps file, see:
// MOE:begin_strip
// Internally: http://go/deps-files and http://go/be#js_deps
// MOE:end_strip
// Externally: https://developers.google.com/closure/library/docs/depswriter
//
// Because of legacy clients, the DOM loader can't be easily removed from
// base.js.  Work was done to make it disableable or replaceable for
// different environments (DOM-less JavaScript interpreters like Rhino or V8,
// for example). See bootstrap/ for more information.


/**
 * @define {boolean} Whether to enable the debug loader.
 *
 * If enabled, a call to goog.require() will attempt to load the namespace by
 * appending a script tag to the DOM (if the namespace has been registered).
 *
 * If disabled, goog.require() will simply assert that the namespace has been
 * provided (and depend on the fact that some outside tool correctly ordered
 * the script).
 */
goog.define('goog.ENABLE_DEBUG_LOADER', true);


/**
 * @param {string} msg
 * @private
 */
goog.logToConsole_ = function(msg) {
  if (goog.global.console) {
    goog.global.console['error'](msg);
  }
};


/**
 * Implements a system for the dynamic resolution of dependencies that works in
 * parallel with the BUILD system. Note that all calls to goog.require will be
 * stripped by the compiler.
 * @see goog.provide
 * @param {string} name Namespace to include (as was given in goog.provide()) in
 *     the form "goog.package.part".
 * @return {?} If called within a goog.module file, the associated namespace or
 *     module otherwise null.
 */
goog.require = function(name) {
  if (goog.ENABLE_DEBUG_LOADER && goog.debugLoader_) {
    goog.getLoader_().earlyProcessLoad(name);
  }

  // If the object already exists we do not need to do anything.
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      if (goog.isInModuleLoader_()) {
        return goog.module.getInternal_(name);
      }
    } else if (goog.ENABLE_DEBUG_LOADER) {
      var moduleLoaderState = goog.moduleLoaderState_;
      goog.moduleLoaderState_ = null;
      try {
        var loader = goog.getLoader_();
        if (loader) {
          loader.load(name);
        } else {
          goog.logToConsole_(
              'Could not load ' + name + ' because there is no debug loader.');
        }
      } finally {
        goog.moduleLoaderState_ = moduleLoaderState;
      }
    }

    return null;
  }
};


/**
 * Path for included scripts.
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to attempt to load Closure's deps file. By default, when uncompiled,
 * deps files will attempt to be loaded.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The function is passed the script source, which is a relative URI. It should
 * return true if the script was imported, false otherwise.
 * @type {(function(string): boolean)|undefined}
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 */
goog.nullFunction = function() {};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error will be thrown
 * when bar() is invoked.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be overridden.
 */
goog.abstractMethod = function() {
  throw new Error('unimplemented abstract method');
};


/**
 * Adds a `getInstance` static method that always returns the same
 * instance object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 * @suppress {missingProperties} 'instance_' isn't a property on 'Function'
 *     but we don't have a better type to use here.
 */
goog.addSingletonGetter = function(ctor) {
  // instance_ is immediately set to prevent issues with sealed constructors
  // such as are encountered when a constructor is returned as the export object
  // of a goog.module in unoptimized code.
  ctor.instance_ = undefined;
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      // NOTE: JSCompiler can't optimize away Array#push.
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    return ctor.instance_ = new ctor;
  };
};


/**
 * All singleton classes that have been instantiated, for testing. Don't read
 * it directly, use the `goog.testing.singleton` module. The compiler
 * removes this variable if unused.
 * @type {!Array<!Function>}
 * @private
 */
goog.instantiatedSingletons_ = [];


/**
 * @define {boolean} Whether to load goog.modules using `eval` when using
 * the debug loader.  This provides a better debugging experience as the
 * source is unmodified and can be edited using Chrome Workspaces or similar.
 * However in some environments the use of `eval` is banned
 * so we provide an alternative.
 */
goog.define('goog.LOAD_MODULE_USING_EVAL', true);


/**
 * @define {boolean} Whether the exports of goog.modules should be sealed when
 * possible.
 */
goog.define('goog.SEAL_MODULE_EXPORTS', goog.DEBUG);


/**
 * The registry of initialized modules:
 * the module identifier to module exports map.
 * @private @const {!Object<string, ?>}
 */
goog.loadedModules_ = {};


/**
 * True if goog.dependencies_ is available.
 * @const {boolean}
 */
goog.DEPENDENCIES_ENABLED = !COMPILED && goog.ENABLE_DEBUG_LOADER;


/**
 * @define {string} How to decide whether to transpile.  Valid values
 * are 'always', 'never', and 'detect'.  The default ('detect') is to
 * use feature detection to determine which language levels need
 * transpilation.
 */
// NOTE(sdh): we could expand this to accept a language level to bypass
// detection: e.g. goog.TRANSPILE == 'es5' would transpile ES6 files but
// would leave ES3 and ES5 files alone.
goog.define('goog.TRANSPILE', 'detect');


/**
 * @define {string} Path to the transpiler.  Executing the script at this
 * path (relative to base.js) should define a function $jscomp.transpile.
 */
goog.define('goog.TRANSPILER', 'transpile.js');


/**
 * @define {string} Debug loader file to load. This file should define an
 * implementation of a `goog.DebugLoader` and register it via
 * `goog.registerDebugLoader`.
 */
goog.define('goog.DEBUG_LOADER', '');


/**
 * @package {?boolean}
 * Visible for testing.
 */
goog.hasBadLetScoping = null;


/**
 * @return {boolean}
 * @package Visible for testing.
 */
goog.useSafari10Workaround = function() {
  if (goog.hasBadLetScoping == null) {
    var hasBadLetScoping;
    try {
      hasBadLetScoping = !eval(
          '"use strict";' +
          'let x = 1; function f() { return typeof x; };' +
          'f() == "number";');
    } catch (e) {
      // Assume that ES6 syntax isn't supported.
      hasBadLetScoping = false;
    }
    goog.hasBadLetScoping = hasBadLetScoping;
  }
  return goog.hasBadLetScoping;
};


/**
 * @param {string} moduleDef
 * @return {string}
 * @package Visible for testing.
 */
goog.workaroundSafari10EvalBug = function(moduleDef) {
  return '(function(){' + moduleDef +
      '\n' +  // Terminate any trailing single line comment.
      ';' +   // Terminate any trailing expression.
      '})();\n';
};


/**
 * @param {function(?):?|string} moduleDef The module definition.
 */
goog.loadModule = function(moduleDef) {
  // NOTE: we allow function definitions to be either in the from
  // of a string to eval (which keeps the original source intact) or
  // in a eval forbidden environment (CSP) we allow a function definition
  // which in its body must call `goog.module`, and return the exports
  // of the module.
  var previousState = goog.moduleLoaderState_;
  try {
    goog.moduleLoaderState_ = {moduleName: '', declareLegacyNamespace: false};
    var exports;
    if (goog.isFunction(moduleDef)) {
      exports = moduleDef.call(undefined, {});
    } else if (goog.isString(moduleDef)) {
      if (goog.useSafari10Workaround()) {
        moduleDef = goog.workaroundSafari10EvalBug(moduleDef);
      }

      exports = goog.loadModuleFromSource_.call(undefined, moduleDef);
    } else {
      throw new Error('Invalid module definition');
    }

    var moduleName = goog.moduleLoaderState_.moduleName;
    if (goog.isString(moduleName) && moduleName) {
      // Don't seal legacy namespaces as they may be used as a parent of
      // another namespace
      if (goog.moduleLoaderState_.declareLegacyNamespace) {
        goog.constructNamespace_(moduleName, exports);
      } else if (
          goog.SEAL_MODULE_EXPORTS && Object.seal &&
          typeof exports == 'object' && exports != null) {
        Object.seal(exports);
      }

      goog.loadedModules_[moduleName] = exports;
    } else {
      throw new Error('Invalid module name \"' + moduleName + '\"');
    }
  } finally {
    goog.moduleLoaderState_ = previousState;
  }
};


/**
 * @private @const
 */
goog.loadModuleFromSource_ = /** @type {function(string):?} */ (function() {
  // NOTE: we avoid declaring parameters or local variables here to avoid
  // masking globals or leaking values into the module definition.
  'use strict';
  var exports = {};
  eval(arguments[0]);
  return exports;
});


/**
 * Normalize a file path by removing redundant ".." and extraneous "." file
 * path components.
 * @param {string} path
 * @return {string}
 * @private
 */
goog.normalizePath_ = function(path) {
  var components = path.split('/');
  var i = 0;
  while (i < components.length) {
    if (components[i] == '.') {
      components.splice(i, 1);
    } else if (
        i && components[i] == '..' && components[i - 1] &&
        components[i - 1] != '..') {
      components.splice(--i, 2);
    } else {
      i++;
    }
  }
  return components.join('/');
};


/**
 * Provides a hook for loading a file when using Closure's goog.require() API
 * with goog.modules.  In particular this hook is provided to support Node.js.
 *
 * @type {(function(string):string)|undefined}
 */
goog.global.CLOSURE_LOAD_FILE_SYNC;


/**
 * Loads file by synchronous XHR. Should not be used in production environments.
 * @param {string} src Source URL.
 * @return {?string} File contents, or null if load failed.
 * @private
 */
goog.loadFileSync_ = function(src) {
  if (goog.global.CLOSURE_LOAD_FILE_SYNC) {
    return goog.global.CLOSURE_LOAD_FILE_SYNC(src);
  } else {
    try {
      /** @type {XMLHttpRequest} */
      var xhr = new goog.global['XMLHttpRequest']();
      xhr.open('get', src, false);
      xhr.send();
      // NOTE: Successful http: requests have a status of 200, but successful
      // file: requests may have a status of zero.  Any other status, or a
      // thrown exception (particularly in case of file: requests) indicates
      // some sort of error, which we treat as a missing or unavailable file.
      return xhr.status == 0 || xhr.status == 200 ? xhr.responseText : null;
    } catch (err) {
      // No need to rethrow or log, since errors should show up on their own.
      return null;
    }
  }
};


/**
 * Lazily retrieves the transpiler and applies it to the source.
 * @param {string} code JS code.
 * @param {string} path Path to the code.
 * @return {string} The transpiled code.
 * @private
 */
goog.transpile_ = function(code, path) {
  var jscomp = goog.global['$jscomp'];
  if (!jscomp) {
    goog.global['$jscomp'] = jscomp = {};
  }
  var transpile = jscomp.transpile;
  if (!transpile) {
    var transpilerPath = goog.basePath + goog.TRANSPILER;
    var transpilerCode = goog.loadFileSync_(transpilerPath);
    if (transpilerCode) {
      // This must be executed synchronously, since by the time we know we
      // need it, we're about to load and write the ES6 code synchronously,
      // so a normal script-tag load will be too slow. Wrapped in a function
      // so that code is eval'd in the global scope.
      (function() {
        eval(transpilerCode + '\n//# sourceURL=' + transpilerPath);
      }).call(goog.global);
      // Even though the transpiler is optional, if $gwtExport is found, it's
      // a sign the transpiler was loaded and the $jscomp.transpile *should*
      // be there.
      if (goog.global['$gwtExport'] && goog.global['$gwtExport']['$jscomp'] &&
          !goog.global['$gwtExport']['$jscomp']['transpile']) {
        throw new Error(
            'The transpiler did not properly export the "transpile" ' +
            'method. $gwtExport: ' + JSON.stringify(goog.global['$gwtExport']));
      }
      // transpile.js only exports a single $jscomp function, transpile. We
      // grab just that and add it to the existing definition of $jscomp which
      // contains the polyfills.
      goog.global['$jscomp'].transpile =
          goog.global['$gwtExport']['$jscomp']['transpile'];
      jscomp = goog.global['$jscomp'];
      transpile = jscomp.transpile;
    }
  }
  if (!transpile) {
    // The transpiler is an optional component.  If it's not available then
    // replace it with a pass-through function that simply logs.
    var suffix = ' requires transpilation but no transpiler was found.';
    // MOE:begin_strip
    suffix +=  // Provide a more appropriate message internally.
        ' Please add "//javascript/closure:transpiler" as a data ' +
        'dependency to ensure it is included.';
    // MOE:end_strip
    transpile = jscomp.transpile = function(code, path) {
      // TODO(sdh): figure out some way to get this error to show up
      // in test results, noting that the failure may occur in many
      // different ways, including in loadModule() before the test
      // runner even comes up.
      goog.logToConsole_(path + suffix);
      return code;
    };
  }
  // Note: any transpilation errors/warnings will be logged to the console.
  return transpile(code, path);
};

//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {?} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // Check these first, so we can avoid calling Object.prototype.toString if
      // possible.
      //
      // IE improperly marshals typeof across execution contexts, but a
      // cross-context object will still return false for "instanceof Object".
      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }

      // HACK: In order to use an Object prototype method on the arbitrary
      //   value, the compiler requires the value be cast to type Object,
      //   even though the ECMA spec explicitly allows it.
      var className = Object.prototype.toString.call(
          /** @type {!Object} */ (value));
      // In Firefox 3.6, attempting to access iframe window objects' length
      // property throws an NS_ERROR_FAILURE, so we need to special-case it
      // here.
      if (className == '[object Window]') {
        return 'object';
      }

      // We cannot always use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if ((className == '[object Array]' ||
           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case.
           typeof value.length == 'number' &&
               typeof value.splice != 'undefined' &&
               typeof value.propertyIsEnumerable != 'undefined' &&
               !value.propertyIsEnumerable('splice')

               )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if ((className == '[object Function]' ||
           typeof value.call != 'undefined' &&
               typeof value.propertyIsEnumerable != 'undefined' &&
               !value.propertyIsEnumerable('call'))) {
        return 'function';
      }

    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox typeof
    // behaves similarly for HTML{Applet,Embed,Object}, Elements and RegExps. We
    // would like to return object for those and we can detect an invalid
    // function by making sure that the function object has a call method.
    return 'object';
  }
  return s;
};


/**
 * Returns true if the specified value is null.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  // Note that undefined == null.
  return val != null;
};


/**
 * Returns true if the specified value is an array.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property. As a special case, a function value is not array like, because its
 * length property is fixed to correspond to the number of expected arguments.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  // We do not use goog.isObject here in order to exclude function values.
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like the
 * value needs to be an object and have a getFullYear() function.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a function.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays and
 * functions.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = typeof val;
  return type == 'object' && val != null || type == 'function';
  // return Object(val) === val also works, but is slower, especially if val is
  // not an object.
};


/**
 * Gets a unique ID for an object. This mutates the object so that further calls
 * with the same object as a parameter returns the same value. The unique ID is
 * guaranteed to be unique across the current session amongst objects that are
 * passed into `getUid`. There is no guarantee that the ID is unique or
 * consistent across sessions. It is unsafe to generate unique ID for function
 * prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Whether the given object is already assigned a unique ID.
 *
 * This does not modify the object.
 *
 * @param {!Object} obj The object to check.
 * @return {boolean} Whether there is an assigned unique id for the object.
 */
goog.hasUid = function(obj) {
  return !!obj[goog.UID_PROPERTY_];
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using `goog.getUid` in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In IE, DOM nodes are not instances of Object and throw an exception if we
  // try to delete.  Instead we try to use removeAttribute.
  if (obj !== null && 'removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }

  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure JavaScript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' + ((Math.random() * 1e9) >>> 0);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 * @deprecated Use goog.getUid instead.
 */
goog.getHashCode = goog.getUid;


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 * @deprecated Use goog.removeUid instead.
 */
goog.removeHashCode = goog.removeUid;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * A native implementation of goog.bind.
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which this should point to when the
 *     function is run.
 * @param {...*} var_args Additional arguments that are partially applied to the
 *     function.
 * @return {!Function} A partially-applied form of the function goog.bind() was
 *     invoked as a method of.
 * @template T
 * @private
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which this should point to when the
 *     function is run.
 * @param {...*} var_args Additional arguments that are partially applied to the
 *     function.
 * @return {!Function} A partially-applied form of the function goog.bind() was
 *     invoked as a method of.
 * @template T
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error();
  }

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };

  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of this 'pre-specified'.
 *
 * Remaining arguments specified at call-time are appended to the pre-specified
 * ones.
 *
 * Also see: {@link #partial}.
 *
 * Usage:
 * <pre>var barMethBound = goog.bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which this should point to when the
 *     function is run.
 * @param {...*} var_args Additional arguments that are partially applied to the
 *     function.
 * @return {!Function} A partially-applied form of the function goog.bind() was
 *     invoked as a method of.
 * @template T
 * @suppress {deprecated} See above.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default Chrome
      // extension environment. This means that for Chrome extensions, they get
      // the implementation of Function.prototype.bind that calls goog.bind
      // instead of the native one. Even worse, we don't want to introduce a
      // circular dependency between goog.bind and Function.prototype.bind, so
      // we have to hack this to make sure it works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like goog.bind(), except that a 'this object' is not required. Useful when
 * the target function is already bound.
 *
 * Usage:
 * var g = goog.partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially applied to fn.
 * @return {!Function} A partially-applied form of the function goog.partial()
 *     was invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Clone the array (with slice()) and append additional arguments
    // to the existing arguments.
    var newArgs = args.slice();
    newArgs.push.apply(newArgs, arguments);
    return fn.apply(this, newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 * @param {Object} target Target.
 * @param {Object} source Source.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = (goog.TRUSTED_SITE && Date.now) || (function() {
             // Unary plus operator converts its operand to a number which in
             // the case of
             // a date is done by calling getTime().
             return +new Date();
           });


/**
 * Evals JavaScript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      try {
        goog.global.eval('var _evalTest_ = 1;');
      } catch (ignore) {
      }
      if (typeof goog.global['_evalTest_'] != 'undefined') {
        try {
          delete goog.global['_evalTest_'];
        } catch (ignore) {
          // Microsoft edge fails the deletion above in strict mode.
        }
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      /** @type {!Document} */
      var doc = goog.global.document;
      var scriptElt =
          /** @type {!HTMLScriptElement} */ (doc.createElement('SCRIPT'));
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(pupius): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.head.appendChild(scriptElt);
      doc.head.removeChild(scriptElt);
    }
  } else {
    throw new Error('goog.globalEval not available');
  }
};


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {?boolean}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @private {!Object<string, string>|undefined}
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;



/**
 * A hook for modifying the default behavior goog.getCssName. The function
 * if present, will receive the standard output of the goog.getCssName as
 * its input.
 *
 * @type {(function(string):string)|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAP_FN;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a hyphen and
 * passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which these
 * mappings are used. In the BY_PART style, each part (i.e. in between hyphens)
 * of the passed in css name is rewritten according to the map. In the BY_WHOLE
 * style, the full css name is looked up in the map directly. If a rewrite is
 * not specified by the map, the compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls to
 * goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x = 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed only the
 * modifier will be processed, as it is assumed the first argument was generated
 * as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  // String() is used for compatibility with compiled soy where the passed
  // className can be non-string objects.
  if (String(className).charAt(0) == '.') {
    throw new Error(
        'className passed in goog.getCssName must not start with ".".' +
        ' You passed: ' + className);
  }

  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename =
        goog.cssNameMappingStyle_ == 'BY_WHOLE' ? getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  var result =
      opt_modifier ? className + '-' + rename(opt_modifier) : rename(className);

  // The special CLOSURE_CSS_NAME_MAP_FN allows users to specify further
  // processing of the class name.
  if (goog.global.CLOSURE_CSS_NAME_MAP_FN) {
    return goog.global.CLOSURE_CSS_NAME_MAP_FN(result);
  }

  return result;
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --process_closure_primitives flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} opt_style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};


/**
 * To use CSS renaming in compiled mode, one of the input files should have a
 * call to goog.setCssNameMapping() with an object literal that the JSCompiler
 * can extract and use to replace all calls to goog.getCssName(). In uncompiled
 * mode, JavaScript code should be loaded before this base.js file that declares
 * a global variable, CLOSURE_CSS_NAME_MAPPING, which is used below. This is
 * to ensure that the mapping is loaded before any calls to goog.getCssName()
 * are made in uncompiled mode.
 *
 * A hook for overriding the CSS name mapping.
 * @type {!Object<string, string>|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAPPING;


if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  // This does not call goog.setCssNameMapping() because the JSCompiler
  // requires that goog.setCssNameMapping() be called with an object literal.
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}


/**
 * Gets a localized message.
 *
 * This function is a compiler primitive. If you give the compiler a localized
 * message bundle, it will replace the string at compile-time with a localized
 * version, and expand goog.getMsg call to a concatenated string.
 *
 * Messages must be initialized in the form:
 * <code>
 * var MSG_NAME = goog.getMsg('Hello {$placeholder}', {'placeholder': 'world'});
 * </code>
 *
 * This function produces a string which should be treated as plain text. Use
 * {@link goog.html.SafeHtmlFormatter} in conjunction with goog.getMsg to
 * produce SafeHtml.
 *
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object<string, string>=} opt_values Maps place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  if (opt_values) {
    str = str.replace(/\{\$([^}]+)}/g, function(match, key) {
      return (opt_values != null && key in opt_values) ? opt_values[key] :
                                                         match;
    });
  }
  return str;
};


/**
 * Gets a localized message. If the message does not have a translation, gives a
 * fallback message.
 *
 * This is useful when introducing a new message that has not yet been
 * translated into all languages.
 *
 * This function is a compiler primitive. Must be used in the form:
 * <code>var x = goog.getMsgWithFallback(MSG_A, MSG_B);</code>
 * where MSG_A and MSG_B were initialized with goog.getMsg.
 *
 * @param {string} a The preferred message.
 * @param {string} b The fallback message.
 * @return {string} The best translated message.
 */
goog.getMsgWithFallback = function(a, b) {
  return a;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated, unless they are
 * exported in turn via this function or goog.exportProperty.
 *
 * Also handy for making public items that are defined in anonymous closures.
 *
 * ex. goog.exportSymbol('public.path.Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction', Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is goog.global.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { };
 *
 * function ChildClass(a, b, c) {
 *   ChildClass.base(this, 'constructor', a, b);
 * }
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // This works.
 * </pre>
 *
 * @param {!Function} childCtor Child class.
 * @param {!Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  /** @override */
  childCtor.prototype.constructor = childCtor;

  /**
   * Calls superclass constructor/method.
   *
   * This function is only available if you use goog.inherits to
   * express inheritance relationships between classes.
   *
   * NOTE: This is a replacement for goog.base and for superClass_
   * property defined in childCtor.
   *
   * @param {!Object} me Should always be "this".
   * @param {string} methodName The method name to call. Calling
   *     superclass constructor can be done with the special string
   *     'constructor'.
   * @param {...*} var_args The arguments to pass to superclass
   *     method/constructor.
   * @return {*} The return value of the superclass method/constructor.
   */
  childCtor.base = function(me, methodName, var_args) {
    // Copying using loop to avoid deop due to passing arguments object to
    // function. This is faster in many JS engines as of late 2014.
    var args = new Array(arguments.length - 2);
    for (var i = 2; i < arguments.length; i++) {
      args[i - 2] = arguments[i];
    }
    return parentCtor.prototype[methodName].apply(me, args);
  };
};


/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * constructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass the name of the
 * method as the second argument to this function. If you do not, you will get a
 * runtime error. This calls the superclass' method with arguments 2-N.
 *
 * This function only works if you use goog.inherits to express inheritance
 * relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the compiler will do
 * macro expansion to remove a lot of the extra overhead that this function
 * introduces. The compiler will also enforce a lot of the assumptions that this
 * function makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 * @suppress {es5Strict} This method can not be used in strict mode, but
 *     all Closure Library consumers must depend on this file.
 * @deprecated goog.base is not strict mode compatible.  Prefer the static
 *     "base" method added to the constructor by goog.inherits
 *     or ES6 classes and the "super" keyword.
 */
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;

  if (goog.STRICT_MODE_COMPATIBLE || (goog.DEBUG && !caller)) {
    throw new Error(
        'arguments.caller not defined.  goog.base() cannot be used ' +
        'with strict mode code. See ' +
        'http://www.ecma-international.org/ecma-262/5.1/#sec-C');
  }

  if (caller.superClass_) {
    // Copying using loop to avoid deop due to passing arguments object to
    // function. This is faster in many JS engines as of late 2014.
    var ctorArgs = new Array(arguments.length - 1);
    for (var i = 1; i < arguments.length; i++) {
      ctorArgs[i - 1] = arguments[i];
    }
    // This is a constructor. Call the superclass constructor.
    return caller.superClass_.constructor.apply(me, ctorArgs);
  }

  // Copying using loop to avoid deop due to passing arguments object to
  // function. This is faster in many JS engines as of late 2014.
  var args = new Array(arguments.length - 2);
  for (var i = 2; i < arguments.length; i++) {
    args[i - 2] = arguments[i];
  }
  var foundCaller = false;
  for (var ctor = me.constructor; ctor;
       ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }

  // If we did not find the caller in the prototype chain, then one of two
  // things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw new Error(
        'goog.base called from a method of one name ' +
        'to a method of a different name');
  }
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the aliases
 * applied.  In uncompiled code the function is simply run since the aliases as
 * written are valid JavaScript.
 *
 * MOE:begin_intracomment_strip
 * See the goog.scope document at http://go/goog.scope
 * MOE:end_intracomment_strip
 *
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *     (e.g. "var Timer = goog.Timer").
 */
goog.scope = function(fn) {
  if (goog.isInModuleLoader_()) {
    throw new Error('goog.scope is not supported within a goog.module.');
  }
  fn.call(goog.global);
};


/*
 * To support uncompiled, strict mode bundles that use eval to divide source
 * like so:
 *    eval('someSource;//# sourceUrl sourcefile.js');
 * We need to export the globally defined symbols "goog" and "COMPILED".
 * Exporting "goog" breaks the compiler optimizations, so we required that
 * be defined externally.
 * NOTE: We don't use goog.exportSymbol here because we don't want to trigger
 * extern generation when that compiler option is enabled.
 */
if (!COMPILED) {
  goog.global['COMPILED'] = COMPILED;
}


//==============================================================================
// goog.defineClass implementation
//==============================================================================


/**
 * Creates a restricted form of a Closure "class":
 *   - from the compiler's perspective, the instance returned from the
 *     constructor is sealed (no new properties may be added).  This enables
 *     better checks.
 *   - the compiler will rewrite this definition to a form that is optimal
 *     for type checking and optimization (initially this will be a more
 *     traditional form).
 *
 * @param {Function} superClass The superclass, Object or null.
 * @param {goog.defineClass.ClassDescriptor} def
 *     An object literal describing
 *     the class.  It may have the following properties:
 *     "constructor": the constructor function
 *     "statics": an object literal containing methods to add to the constructor
 *        as "static" methods or a function that will receive the constructor
 *        function as its only parameter to which static properties can
 *        be added.
 *     all other properties are added to the prototype.
 * @return {!Function} The class constructor.
 */
goog.defineClass = function(superClass, def) {
  // TODO(johnlenz): consider making the superClass an optional parameter.
  var constructor = def.constructor;
  var statics = def.statics;
  // Wrap the constructor prior to setting up the prototype and static methods.
  if (!constructor || constructor == Object.prototype.constructor) {
    constructor = function() {
      throw new Error(
          'cannot instantiate an interface (no constructor defined).');
    };
  }

  var cls = goog.defineClass.createSealingConstructor_(constructor, superClass);
  if (superClass) {
    goog.inherits(cls, superClass);
  }

  // Remove all the properties that should not be copied to the prototype.
  delete def.constructor;
  delete def.statics;

  goog.defineClass.applyProperties_(cls.prototype, def);
  if (statics != null) {
    if (statics instanceof Function) {
      statics(cls);
    } else {
      goog.defineClass.applyProperties_(cls, statics);
    }
  }

  return cls;
};


/**
 * @typedef {{
 *   constructor: (!Function|undefined),
 *   statics: (Object|undefined|function(Function):void)
 * }}
 */
goog.defineClass.ClassDescriptor;


/**
 * @define {boolean} Whether the instances returned by goog.defineClass should
 *     be sealed when possible.
 *
 * When sealing is disabled the constructor function will not be wrapped by
 * goog.defineClass, making it incompatible with ES6 class methods.
 */
goog.define('goog.defineClass.SEAL_CLASS_INSTANCES', goog.DEBUG);


/**
 * If goog.defineClass.SEAL_CLASS_INSTANCES is enabled and Object.seal is
 * defined, this function will wrap the constructor in a function that seals the
 * results of the provided constructor function.
 *
 * @param {!Function} ctr The constructor whose results maybe be sealed.
 * @param {Function} superClass The superclass constructor.
 * @return {!Function} The replacement constructor.
 * @private
 */
goog.defineClass.createSealingConstructor_ = function(ctr, superClass) {
  if (!goog.defineClass.SEAL_CLASS_INSTANCES) {
    // Do now wrap the constructor when sealing is disabled. Angular code
    // depends on this for injection to work properly.
    return ctr;
  }

  // Compute whether the constructor is sealable at definition time, rather
  // than when the instance is being constructed.
  var superclassSealable = !goog.defineClass.isUnsealable_(superClass);

  /**
   * @this {Object}
   * @return {?}
   */
  var wrappedCtr = function() {
    // Don't seal an instance of a subclass when it calls the constructor of
    // its super class as there is most likely still setup to do.
    var instance = ctr.apply(this, arguments) || this;
    instance[goog.UID_PROPERTY_] = instance[goog.UID_PROPERTY_];

    if (this.constructor === wrappedCtr && superclassSealable &&
        Object.seal instanceof Function) {
      Object.seal(instance);
    }
    return instance;
  };

  return wrappedCtr;
};


/**
 * @param {Function} ctr The constructor to test.
 * @return {boolean} Whether the constructor has been tagged as unsealable
 *     using goog.tagUnsealableClass.
 * @private
 */
goog.defineClass.isUnsealable_ = function(ctr) {
  return ctr && ctr.prototype &&
      ctr.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_];
};


// TODO(johnlenz): share these values with the goog.object
/**
 * The names of the fields that are defined on Object.prototype.
 * @type {!Array<string>}
 * @private
 * @const
 */
goog.defineClass.OBJECT_PROTOTYPE_FIELDS_ = [
  'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  'toLocaleString', 'toString', 'valueOf'
];


// TODO(johnlenz): share this function with the goog.object
/**
 * @param {!Object} target The object to add properties to.
 * @param {!Object} source The object to copy properties from.
 * @private
 */
goog.defineClass.applyProperties_ = function(target, source) {
  // TODO(johnlenz): update this to support ES5 getters/setters

  var key;
  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }

  // For IE the for-in-loop does not contain any properties that are not
  // enumerable on the prototype object (for example isPrototypeOf from
  // Object.prototype) and it will also not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
  for (var i = 0; i < goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length; i++) {
    key = goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[i];
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
};


/**
 * Sealing classes breaks the older idiom of assigning properties on the
 * prototype rather than in the constructor. As such, goog.defineClass
 * must not seal subclasses of these old-style classes until they are fixed.
 * Until then, this marks a class as "broken", instructing defineClass
 * not to seal subclasses.
 * @param {!Function} ctr The legacy constructor to tag as unsealable.
 */
goog.tagUnsealableClass = function(ctr) {
  if (!COMPILED && goog.defineClass.SEAL_CLASS_INSTANCES) {
    ctr.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_] = true;
  }
};


/**
 * Name for unsealable tag property.
 * @const @private {string}
 */
goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_ = 'goog_defineClass_legacy_unsealable';



if (goog.DEPENDENCIES_ENABLED) {
  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    /** @type {!Document} */
    var doc = goog.global.document;
    return doc != null && 'write' in doc;  // XULDocument misses write.
  };


  /**
   * Tries to detect the base path of base.js script that bootstraps Closure.
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.isDef(goog.global.CLOSURE_BASE_PATH) &&
        // Anti DOM-clobbering runtime check (b/37736576).
        goog.isString(goog.global.CLOSURE_BASE_PATH)) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    /** @type {!Document} */
    var doc = goog.global.document;
    // If we have a currentScript available, use it exclusively.
    var currentScript = doc.currentScript;
    if (currentScript) {
      var scripts = [currentScript];
    } else {
      var scripts = doc.getElementsByTagName('SCRIPT');
    }
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var script = /** @type {!HTMLScriptElement} */ (scripts[i]);
      var src = script.src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };

  goog.findBasePath_();

  /** @struct @constructor @final */
  goog.Transpiler = function() {
    /** @private {?Object<string, boolean>} */
    this.requiresTranspilation_ = null;
  };


  // MOE:begin_strip
  // LINT.IfChange
  // MOE:end_strip
  /**
   * Returns a newly created map from language mode string to a boolean
   * indicating whether transpilation should be done for that mode.
   *
   * Guaranteed invariant:
   * For any two modes, l1 and l2 where l2 is a newer mode than l1,
   * `map[l1] == true` implies that `map[l2] == true`.
   *
   * Note this method is extracted and used elsewhere, so it cannot rely on
   * anything external (it should easily be able to be transformed into a
   * standalone, top level function).
   *
   * @private
   * @return {!Object<string, boolean>}
   */
  goog.Transpiler.prototype.createRequiresTranspilation_ = function() {
    var /** !Object<string, boolean> */ requiresTranspilation = {'es3': false};
    var transpilationRequiredForAllLaterModes = false;

    /**
     * Adds an entry to requiresTranspliation for the given language mode.
     *
     * IMPORTANT: Calls must be made in order from oldest to newest language
     * mode.
     * @param {string} modeName
     * @param {function(): boolean} isSupported Returns true if the JS engine
     *     supports the given mode.
     */
    function addNewerLanguageTranspilationCheck(modeName, isSupported) {
      if (transpilationRequiredForAllLaterModes) {
        requiresTranspilation[modeName] = true;
      } else if (isSupported()) {
        requiresTranspilation[modeName] = false;
      } else {
        requiresTranspilation[modeName] = true;
        transpilationRequiredForAllLaterModes = true;
      }
    }

    /**
     * Does the given code evaluate without syntax errors and return a truthy
     * result?
     */
    function /** boolean */ evalCheck(/** string */ code) {
      try {
        return !!eval(code);
      } catch (ignored) {
        return false;
      }
    }

    var userAgent = goog.global.navigator && goog.global.navigator.userAgent ?
        goog.global.navigator.userAgent :
        '';

    // Identify ES3-only browsers by their incorrect treatment of commas.
    addNewerLanguageTranspilationCheck('es5', function() {
      return evalCheck('[1,].length==1');
    });
    addNewerLanguageTranspilationCheck('es6', function() {
      // Edge has a non-deterministic (i.e., not reproducible) bug with ES6:
      // https://github.com/Microsoft/ChakraCore/issues/1496.
      // MOE:begin_strip
      // TODO(joeltine): Our internal web-testing version of Edge will need to
      // be updated before we can remove this check. See http://b/34945376.
      // MOE:end_strip
      var re = /Edge\/(\d+)(\.\d)*/i;
      var edgeUserAgent = userAgent.match(re);
      if (edgeUserAgent && Number(edgeUserAgent[1]) < 15) {
        return false;
      }
      // Test es6: [FF50 (?), Edge 14 (?), Chrome 50]
      //   (a) default params (specifically shadowing locals),
      //   (b) destructuring, (c) block-scoped functions,
      //   (d) for-of (const), (e) new.target/Reflect.construct
      var es6fullTest =
          'class X{constructor(){if(new.target!=String)throw 1;this.x=42}}' +
          'let q=Reflect.construct(X,[],String);if(q.x!=42||!(q instanceof ' +
          'String))throw 1;for(const a of[2,3]){if(a==2)continue;function ' +
          'f(z={a}){let a=0;return z.a}{function f(){return 0;}}return f()' +
          '==3}';

      return evalCheck('(()=>{"use strict";' + es6fullTest + '})()');
    });
    // TODO(joeltine): Remove es6-impl references for b/31340605.
    // Consider es6-impl (widely-implemented es6 features) to be supported
    // whenever es6 is supported. Technically es6-impl is a lower level of
    // support than es6, but we don't have tests specifically for it.
    addNewerLanguageTranspilationCheck('es6-impl', function() {
      return true;
    });
    // ** and **= are the only new features in 'es7'
    addNewerLanguageTranspilationCheck('es7', function() {
      return evalCheck('2 ** 2 == 4');
    });
    // async functions are the only new features in 'es8'
    addNewerLanguageTranspilationCheck('es8', function() {
      return evalCheck('async () => 1, true');
    });
    // Object rest/spread. TODO(tbreisacher): Rename this to 'es9' if
    // rest/spread end up being finalized in the 2018 spec.
    addNewerLanguageTranspilationCheck('es_next', function() {
      return evalCheck('({...rest} = {}), true');
    });
    return requiresTranspilation;
  };
  // MOE:begin_strip
  // LINT.ThenChange(//depot/google3/java/com/google/testing/web/devtools/updatebrowserinfo/requires_transpilation.js)
  // MOE:end_strip


  /**
   * Determines whether the given language needs to be transpiled.
   * @param {string} lang
   * @return {boolean}
   */
  goog.Transpiler.prototype.needsTranspile = function(lang) {
    if (goog.TRANSPILE == 'always') {
      return true;
    } else if (goog.TRANSPILE == 'never') {
      return false;
    } else if (!this.requiresTranspilation_) {
      this.requiresTranspilation_ = this.createRequiresTranspilation_();
    }
    if (lang in this.requiresTranspilation_) {
      return this.requiresTranspilation_[lang];
    } else {
      throw new Error('Unknown language mode: ' + lang);
    }
  };


  /**
   * Lazily retrieves the transpiler and applies it to the source.
   * @param {string} code JS code.
   * @param {string} path Path to the code.
   * @return {string} The transpiled code.
   */
  goog.Transpiler.prototype.transpile = function(code, path) {
    // TODO(johnplaisted): We should delete goog.transpile_ and just have this
    // function. But there's some compile error atm where goog.global is being
    // stripped incorrectly without this.
    return goog.transpile_(code, path);
  };


  /** @private @final {!goog.Transpiler} */
  goog.transpiler_ = new goog.Transpiler();


  /**
   * A debug loader is responsible for downloading and executing javascript
   * files in an unbundled, uncompiled environment.
   *
   * @struct @constructor
   */
  goog.DebugLoader = function() {
    /**
     * This object is used to keep track of dependencies and other data that is
     * used for loading scripts.
     * @private
     * @type {{
     *   loadFlags: !Object<string, !Object<string, string>>,
     *   nameToPath: !Object<string, string>,
     *   requires: !Object<string, !Object<string, boolean>>,
     *   visited: !Object<string, boolean>,
     *   written: !Object<string, boolean>,
     *   deferred: !Object<string, string>
     * }}
     */
    this.dependencies_ = {
      loadFlags: {},  // 1 to 1

      nameToPath: {},  // 1 to 1

      requires: {},  // 1 to many

      // Used when resolving dependencies to prevent us from visiting file
      // twice.
      visited: {},

      written: {},  // Used to keep track of script files we have written.

      deferred: {}  // Used to track deferred module evaluations in old IEs
    };

    /**
     * Whether IE9 or earlier is waiting on a dependency.  This ensures that
     * deferred modules that have no non-deferred dependencies actually get
     * loaded, since if we defer them and then never pull in a non-deferred
     * script, then `this.loadQueuedModules_` will never be called.  Instead,
     * if not waiting on anything we simply don't defer in the first place.
     * @private {boolean}
     */
    this.oldIeWaiting_ = false;

    /** @private {!Array<string>} */
    this.queuedModules_ = [];

    /** @private {number} */
    this.lastNonModuleScriptIndex_ = 0;
  };


  /**
   * Whether the browser is IE9 or earlier, which needs special handling
   * for deferred modules.
   * @const @private {boolean}
   */
  goog.DebugLoader.IS_OLD_IE_ =
      !!(!goog.global.atob && goog.global.document && goog.global.document.all);


  /**
   * Performs any needed preprocessing of a goog.require call.
   *
   * @param {string} name
   */
  goog.DebugLoader.prototype.earlyProcessLoad = function(name) {
    if (goog.DebugLoader.IS_OLD_IE_) {
      this.maybeProcessDeferredDep_(name);
    }
  };


  /**
   * Loads the given symbol along with any dependencies.
   *
   * @param {string} name
   */
  goog.DebugLoader.prototype.load = function(name) {
    var pathToLoad = this.getPathFromDeps_(name);
    if (!pathToLoad) {
      var errorMessage = 'goog.require could not find: ' + name;
      this.logToConsole(errorMessage);

      // MOE:begin_strip

      // NOTE(nicksantos): We could always throw an error, but this would
      // break legacy users that depended on this failing silently. Instead,
      // the compiler should warn us when there are invalid goog.require
      // calls. For now, we simply give clients a way to turn strict mode on.
      if (goog.useStrictRequires) {
        throw Error(errorMessage);
      }

      // In external Closure, always error.
      // MOE:end_strip_and_replace throw Error(errorMessage);
    } else {
      /** @type {!Array<string>} The scripts we need to write this time. */
      var scripts = [];
      var seenScript = {};
      var deps = this.dependencies_;
      var loader = this;

      /** @param {string} path */
      var visitNode = function(path) {
        if (path in deps.written) {
          return;
        }

        // We have already visited this one. We can get here if we have cyclic
        // dependencies.
        if (path in deps.visited) {
          return;
        }

        deps.visited[path] = true;

        if (path in deps.requires) {
          for (var requireName in deps.requires[path]) {
            // If the required name is defined, we assume that it was already
            // bootstrapped by other means.
            if (!loader.isProvided(requireName)) {
              if (requireName in deps.nameToPath) {
                visitNode(deps.nameToPath[requireName]);
              } else {
                throw Error('Undefined nameToPath for ' + requireName);
              }
            }
          }
        }

        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
      };

      visitNode(pathToLoad);

      // record that we are going to load all these scripts.
      for (var i = 0; i < scripts.length; i++) {
        var path = scripts[i];
        this.dependencies_.written[path] = true;
      }

      for (var i = 0; i < scripts.length; i++) {
        var path = scripts[i];
        if (path) {
          var loadFlags = deps.loadFlags[path] || {};
          var languageLevel = loadFlags['lang'] || 'es3';
          var needsTranspile =
              this.getTranspiler().needsTranspile(languageLevel);
          if (loadFlags['module'] == 'goog' || needsTranspile) {
            this.importProcessedScript_(
                goog.basePath + path, loadFlags['module'] == 'goog',
                needsTranspile);
          } else {
            this.importScript_(goog.basePath + path);
          }
        } else {
          throw Error('Undefined script input');
        }
      }
    }
  };


  /**
   * @param {string} relPath
   * @param {!Array<string>} provides
   * @param {!Array<string>} requires
   * @param {boolean|!Object<string>=} opt_loadFlags
   * @see goog.addDependency
   */
  goog.DebugLoader.prototype.addDependency = function(
      relPath, provides, requires, opt_loadFlags) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = this.dependencies_;
    if (!opt_loadFlags || typeof opt_loadFlags === 'boolean') {
      opt_loadFlags = opt_loadFlags ? {'module': 'goog'} : {};
    }
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      deps.loadFlags[path] = opt_loadFlags;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  };

  /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @param {string=} opt_sourceText The optionally source text to evaluate
   * @private
   */
  goog.DebugLoader.prototype.importScript_ = function(src, opt_sourceText) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
        goog.bind(this.writeScriptTag_, this);
    if (importScript(src, opt_sourceText)) {
      this.dependencies_.written[src] = true;
    }
  };


  /**
   * Given a URL initiate retrieval and execution of a script that needs
   * pre-processing.
   * @param {string} src Script source URL.
   * @param {boolean} isModule Whether this is a goog.module.
   * @param {boolean} needsTranspile Whether this source needs transpilation.
   * @private
   */
  goog.DebugLoader.prototype.importProcessedScript_ = function(
      src, isModule, needsTranspile) {
    // In an attempt to keep browsers from timing out loading scripts using
    // synchronous XHRs, put each load in its own script block.
    var bootstrap = 'goog.debugLoader_.retrieveAndExec_("' + src + '", ' +
        isModule + ', ' + needsTranspile + ');';

    this.importScript_('', bootstrap);
  };

  /**
   * Retrieve and execute a script that needs some sort of wrapping.
   * @param {string} src Script source URL.
   * @param {boolean} isModule Whether to load as a module.
   * @param {boolean} needsTranspile Whether to transpile down to ES3.
   * @private
   * @suppress {unusedPrivateMembers}
   */
  goog.DebugLoader.prototype.retrieveAndExec_ = function(
      src, isModule, needsTranspile) {
    if (!COMPILED) {
      // The full but non-canonicalized URL for later use.
      var originalPath = src;
      // Canonicalize the path, removing any /./ or /../ since Chrome's
      // debugging console doesn't auto-canonicalize XHR loads as it does
      // <script> srcs.
      src = this.normalizePath(src);

      var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
          goog.bind(this.writeScriptTag_, this);

      var scriptText = this.loadFileSync(src);
      if (scriptText == null) {
        throw new Error('Load of "' + src + '" failed');
      }

      if (needsTranspile) {
        scriptText = this.getTranspiler().transpile(scriptText, src);
      }

      if (isModule) {
        scriptText = this.wrapModule_(src, scriptText);
      } else {
        scriptText += '\n//# sourceURL=' + src;
      }
      var isOldIE = goog.DebugLoader.IS_OLD_IE_;
      if (isOldIE && this.oldIeWaiting_) {
        this.dependencies_.deferred[originalPath] = scriptText;
        this.queuedModules_.push(originalPath);
      } else {
        importScript(src, scriptText);
      }
    }
  };


  /**
   * Return an appropriate module text. Suitable to insert into
   * a script tag (that is unescaped).
   * @param {string} srcUrl
   * @param {string} scriptText
   * @return {string}
   * @private
   */
  goog.DebugLoader.prototype.wrapModule_ = function(srcUrl, scriptText) {
    if (!goog.LOAD_MODULE_USING_EVAL || !goog.isDef(goog.global.JSON)) {
      return '' +
          'goog.loadModule(function(exports) {' +
          '"use strict";' + scriptText +
          '\n' +  // terminate any trailing single line comment.
          ';return exports' +
          '});' +
          '\n//# sourceURL=' + srcUrl + '\n';
    } else {
      return '' +
          'goog.loadModule(' +
          goog.global.JSON.stringify(
              scriptText + '\n//# sourceURL=' + srcUrl + '\n') +
          ');';
    }
  };

  // On IE9 and earlier, it is necessary to handle
  // deferred module loads. In later browsers, the
  // code to be evaluated is simply inserted as a script
  // block in the correct order. To eval deferred
  // code at the right time, we piggy back on goog.require to call
  // this.maybeProcessDeferredDep_.
  //
  // The goog.requires are used both to bootstrap
  // the loading process (when no deps are available) and
  // declare that they should be available.
  //
  // Here we eval the sources, if all the deps are available
  // either already eval'd or goog.require'd.  This will
  // be the case when all the dependencies have already
  // been loaded, and the dependent module is loaded.
  //
  // But this alone isn't sufficient because it is also
  // necessary to handle the case where there is no root
  // that is not deferred.  For that there we register for an event
  // and trigger this.loadQueuedModules_ handle any remaining deferred
  // evaluations.

  /**
   * Handle any remaining deferred goog.module evals.
   * @private
   */
  goog.DebugLoader.prototype.loadQueuedModules_ = function() {
    var count = this.queuedModules_.length;
    if (count > 0) {
      var queue = this.queuedModules_;
      this.queuedModules_ = [];
      for (var i = 0; i < count; i++) {
        var path = queue[i];
        this.maybeProcessDeferredPath_(path);
      }
    }
    this.oldIeWaiting_ = false;
  };


  /**
   * Eval the named module if its dependencies are
   * available.
   * @param {string} name The module to load.
   * @private
   */
  goog.DebugLoader.prototype.maybeProcessDeferredDep_ = function(name) {
    if (this.isDeferredModule_(name) && this.allDepsAreAvailable_(name)) {
      var path = this.getPathFromDeps_(name);
      this.maybeProcessDeferredPath_(goog.basePath + path);
    }
  };


  /**
   * @param {string} name The module to check.
   * @return {boolean} Whether the name represents a
   *     module whose evaluation has been deferred.
   * @private
   */
  goog.DebugLoader.prototype.isDeferredModule_ = function(name) {
    var path = this.getPathFromDeps_(name);
    var loadFlags = path && this.dependencies_.loadFlags[path] || {};
    var languageLevel = loadFlags['lang'] || 'es3';
    if (path &&
        (loadFlags['module'] == 'goog' ||
         this.getTranspiler().needsTranspile(languageLevel))) {
      var abspath = goog.basePath + path;
      return (abspath) in this.dependencies_.deferred;
    }
    return false;
  };


  /**
   * @param {string} name The module to check.
   * @return {boolean} Whether the name represents a
   *     module whose declared dependencies have all been loaded
   *     (eval'd or a deferred module load)
   * @private
   */
  goog.DebugLoader.prototype.allDepsAreAvailable_ = function(name) {
    var path = this.getPathFromDeps_(name);
    if (path && (path in this.dependencies_.requires)) {
      for (var requireName in this.dependencies_.requires[path]) {
        if (!this.isProvided(requireName) &&
            !this.isDeferredModule_(requireName)) {
          return false;
        }
      }
    }
    return true;
  };


  /**
   * @param {string} abspath
   * @private
   */
  goog.DebugLoader.prototype.maybeProcessDeferredPath_ = function(abspath) {
    if (abspath in this.dependencies_.deferred) {
      var src = this.dependencies_.deferred[abspath];
      delete this.dependencies_.deferred[abspath];
      goog.globalEval(src);
    }
  };


  /**
   * Writes a new script pointing to `src` directly into the DOM.
   *
   * NOTE: This method is not CSP-compliant. @see this.appendScriptSrcNode_ for
   * the fallback mechanism.
   *
   * @param {string} src The script URL.
   * @private
   */
  goog.DebugLoader.prototype.writeScriptSrcNode_ = function(src) {
    goog.global.document.write(
        '<script type="text/javascript" src="' + src + '"></' +
        'script>');
  };


  /**
   * Appends a new script node to the DOM using a CSP-compliant mechanism. This
   * method exists as a fallback for document.write (which is not allowed in a
   * strict CSP context, e.g., Chrome apps).
   *
   * NOTE: This method is not analogous to using document.write to insert a
   * <script> tag; specifically, the user agent will execute a script added by
   * document.write immediately after the current script block finishes
   * executing, whereas the DOM-appended script node will not be executed until
   * the entire document is parsed and executed. That is to say, this script is
   * added to the end of the script execution queue.
   *
   * The page must not attempt to call goog.required entities until after the
   * document has loaded, e.g., in or after the window.onload callback.
   *
   * @param {string} src The script URL.
   * @private
   */
  goog.DebugLoader.prototype.appendScriptSrcNode_ = function(src) {
    /** @type {!Document} */
    var doc = goog.global.document;
    var scriptEl =
        /** @type {!HTMLScriptElement} */ (doc.createElement('script'));
    scriptEl.type = 'text/javascript';
    scriptEl.src = src;
    scriptEl.defer = false;
    scriptEl.async = false;
    doc.head.appendChild(scriptEl);
  };


  /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script url.
   * @param {string=} opt_sourceText The optionally source text to evaluate
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.DebugLoader.prototype.writeScriptTag_ = function(src, opt_sourceText) {
    if (this.inHtmlDocument()) {
      /** @type {!HTMLDocument} */
      var doc = goog.global.document;

      // If the user tries to require a new symbol after document load,
      // something has gone terribly wrong. Doing a document.write would
      // wipe out the page. This does not apply to the CSP-compliant method
      // of writing script tags.
      if (!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING &&
          doc.readyState == 'complete') {
        // Certain test frameworks load base.js multiple times, which tries
        // to write deps.js each time. If that happens, just fail silently.
        // These frameworks wipe the page between each load of base.js, so this
        // is OK.
        var isDeps = /\bdeps.js$/.test(src);
        if (isDeps) {
          return false;
        } else {
          throw Error('Cannot write "' + src + '" after document load');
        }
      }

      if (opt_sourceText === undefined) {
        if (!goog.DebugLoader.IS_OLD_IE_) {
          if (goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING) {
            this.appendScriptSrcNode_(src);
          } else {
            this.writeScriptSrcNode_(src);
          }
        } else {
          this.oldIeWaiting_ = true;
          var state = ' onreadystatechange=\'goog.debugLoader_' +
              '.onScriptLoad_(this, ' + ++this.lastNonModuleScriptIndex_ +
              ')\' ';
          doc.write(
              '<script type="text/javascript" src="' + src + '"' + state +
              '></' +
              'script>');
        }
      } else {
        doc.write(
            '<script type="text/javascript">' +
            this.protectScriptTag_(opt_sourceText) + '</' +
            'script>');
      }
      return true;
    } else {
      return false;
    }
  };

  /**
   * Rewrites closing script tags in input to avoid ending an enclosing script
   * tag.
   *
   * @param {string} str
   * @return {string}
   * @private
   */
  goog.DebugLoader.prototype.protectScriptTag_ = function(str) {
    return str.replace(/<\/(SCRIPT)/ig, '\\x3c/$1');
  };


  /**
   * A readystatechange handler for legacy IE
   * @param {?} script
   * @param {number} scriptIndex
   * @return {boolean}
   * @private
   * @suppress {unusedPrivateMembers}
   */
  goog.DebugLoader.prototype.onScriptLoad_ = function(script, scriptIndex) {
    // for now load the modules when we reach the last script,
    // later allow more inter-mingling.
    if (script.readyState == 'complete' &&
        this.lastNonModuleScriptIndex_ == scriptIndex) {
      this.loadQueuedModules_();
    }
    return true;
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
  goog.DebugLoader.prototype.getPathFromDeps_ = function(rule) {
    if (rule in this.dependencies_.nameToPath) {
      return this.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };


  /**
   * @return {!goog.Transpiler}
   * @protected @final
   */
  goog.DebugLoader.prototype.getTranspiler = function() {
    return goog.transpiler_;
  };


  /**
   * @param {string} namespaceOrPath
   * @return {boolean}
   * @protected @final
   */
  goog.DebugLoader.prototype.isProvided = function(namespaceOrPath) {
    return goog.isProvided_(namespaceOrPath);
  };


  /**
   * @return {boolean}
   * @protected @final
   */
  goog.DebugLoader.prototype.inHtmlDocument = function() {
    return goog.inHtmlDocument_();
  };


  /**
   * @param {string} message
   * @protected @final
   */
  goog.DebugLoader.prototype.logToConsole = function(message) {
    goog.logToConsole_(message);
  };


  /**
   * @param {string} srcUrl
   * @return {?string}
   * @protected @final
   */
  goog.DebugLoader.prototype.loadFileSync = function(srcUrl) {
    return goog.loadFileSync_(srcUrl);
  };


  /**
   * @param {string} path
   * @return {string}
   * @protected @final
   */
  goog.DebugLoader.prototype.normalizePath = function(path) {
    return goog.normalizePath_(path);
  };


  /** @private {?goog.DebugLoader} */
  goog.debugLoader_ = null;


  /** @param {!goog.DebugLoader} loader */
  goog.registerDebugLoader = function(loader) {
    if (goog.debugLoader_) {
      throw new Error('Debug loader already registered!');
    }
    if (!(loader instanceof goog.DebugLoader)) {
      throw new Error('Not a goog.DebugLoader.');
    }
    goog.debugLoader_ = loader;
  };

  /** @private @return {!goog.DebugLoader} */
  goog.getLoader_ = function() {
    if (!goog.debugLoader_ && goog.DEBUG_LOADER) {
      // Tried to load earlier but failed.
      throw new Error('Loaded debug loader file but no loader was registered!');
    } else if (!goog.debugLoader_) {
      // No custom loader and no closure deps. Was not made earlier; make it
      // now.
      goog.debugLoader_ = new goog.DebugLoader();
    }
    return goog.debugLoader_;
  };

  (function() {
    var tempLoader;
    if (goog.DEBUG_LOADER) {
      tempLoader = new goog.DebugLoader();
      tempLoader.importScript_(goog.basePath + goog.DEBUG_LOADER);
    }

    // Allow projects to manage the deps files themselves.
    if (!goog.global.CLOSURE_NO_DEPS) {
      tempLoader = tempLoader || new goog.DebugLoader();
      if (!goog.DEBUG_LOADER) {
        // Can reuse the same debug loader in the rest of the application.
        goog.registerDebugLoader(tempLoader);
      }
      tempLoader.importScript_(goog.basePath + 'deps.js');
    }
  })();
}

//javascript/closure/transitionalforwarddeclarations.js
// Copyright 2017 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview The forward declarations in this file are here to faciliate
 * the removal of "deps.js" from the "base" rule.  These types are
 * included in various extern files.  These rules should be cleaned up
 * so that these declarations aren't necessary.
 * @suppress {extraRequire}
 */

goog.forwardDeclare('goog.Promise');
goog.forwardDeclare('goog.date.DateLike');
goog.forwardDeclare('goog.date.DateTime');
goog.forwardDeclare('goog.events.EventId');
goog.forwardDeclare('goog.events.Key');
goog.forwardDeclare('goog.events.KeyCodes');
goog.forwardDeclare('goog.i18n.TimeZone');
goog.forwardDeclare('goog.math.Range');
goog.forwardDeclare('goog.math.Size');
goog.forwardDeclare('goog.structs.Map');

//javascript/closure/string/string.js
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for string manipulation.
 * @author pupius@google.com (Daniel Pupius)
 * @author arv@google.com (Erik Arvidsson)
 */


/**
 * Namespace for string utilities
 */
goog.provide('goog.string');
goog.provide('goog.string.Unicode');


/**
 * @define {boolean} Enables HTML escaping of lowercase letter "e" which helps
 * with detection of double-escaping as this letter is frequently used.
 */
goog.define('goog.string.DETECT_DOUBLE_ESCAPING', false);


/**
 * @define {boolean} Whether to force non-dom html unescaping.
 */
goog.define('goog.string.FORCE_NON_DOM_HTML_UNESCAPING', false);


/**
 * Common Unicode string characters.
 * @enum {string}
 */
goog.string.Unicode = {
  NBSP: '\xa0'
};


/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of `str`.
 * @return {boolean} True if `str` begins with `prefix`.
 */
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};


/**
 * Fast suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of `str`.
 * @return {boolean} True if `str` ends with `suffix`.
 */
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};


/**
 * Case-insensitive prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix  A string to look for at the end of `str`.
 * @return {boolean} True if `str` begins with `prefix` (ignoring
 *     case).
 */
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(
             prefix, str.substr(0, prefix.length)) == 0;
};


/**
 * Case-insensitive suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of `str`.
 * @return {boolean} True if `str` ends with `suffix` (ignoring
 *     case).
 */
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return (
      goog.string.caseInsensitiveCompare(
          suffix, str.substr(str.length - suffix.length, suffix.length)) == 0);
};


/**
 * Case-insensitive equality checker.
 * @param {string} str1 First string to check.
 * @param {string} str2 Second string to check.
 * @return {boolean} True if `str1` and `str2` are the same string,
 *     ignoring case.
 */
goog.string.caseInsensitiveEquals = function(str1, str2) {
  return str1.toLowerCase() == str2.toLowerCase();
};


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} str The string containing the pattern.
 * @param {...*} var_args The items to substitute into the pattern.
 * @return {string} A copy of `str` in which each occurrence of
 *     {@code %s} has been replaced an argument from `var_args`.
 */
goog.string.subs = function(str, var_args) {
  var splitParts = str.split('%s');
  var returnString = '';

  var subsArguments = Array.prototype.slice.call(arguments, 1);
  while (subsArguments.length &&
         // Replace up to the last split part. We are inserting in the
         // positions between split parts.
         splitParts.length > 1) {
    returnString += splitParts.shift() + subsArguments.shift();
  }

  return returnString + splitParts.join('%s');  // Join unused '%s'
};


/**
 * Converts multiple whitespace chars (spaces, non-breaking-spaces, new lines
 * and tabs) to a single space, and strips leading and trailing whitespace.
 * @param {string} str Input string.
 * @return {string} A copy of `str` with collapsed whitespace.
 */
goog.string.collapseWhitespace = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
};


/**
 * Checks if a string is empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} Whether `str` is empty or whitespace only.
 */
goog.string.isEmptyOrWhitespace = function(str) {
  // testing length == 0 first is actually slower in all browsers (about the
  // same in Opera).
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return /^[\s\xa0]*$/.test(str);
};


/**
 * Checks if a string is empty.
 * @param {string} str The string to check.
 * @return {boolean} Whether `str` is empty.
 */
goog.string.isEmptyString = function(str) {
  return str.length == 0;
};


/**
 * Checks if a string is empty or contains only whitespaces.
 *
 * @param {string} str The string to check.
 * @return {boolean} Whether `str` is empty or whitespace only.
 * @deprecated Use goog.string.isEmptyOrWhitespace instead.
 */
goog.string.isEmpty = goog.string.isEmptyOrWhitespace;


/**
 * Checks if a string is null, undefined, empty or contains only whitespaces.
 * @param {*} str The string to check.
 * @return {boolean} Whether `str` is null, undefined, empty, or
 *     whitespace only.
 * @deprecated Use goog.string.isEmptyOrWhitespace(goog.string.makeSafe(str))
 *     instead.
 */
goog.string.isEmptyOrWhitespaceSafe = function(str) {
  return goog.string.isEmptyOrWhitespace(goog.string.makeSafe(str));
};


/**
 * Checks if a string is null, undefined, empty or contains only whitespaces.
 *
 * @param {*} str The string to check.
 * @return {boolean} Whether `str` is null, undefined, empty, or
 *     whitespace only.
 * @deprecated Use goog.string.isEmptyOrWhitespace instead.
 */
goog.string.isEmptySafe = goog.string.isEmptyOrWhitespaceSafe;


/**
 * Checks if a string is all breaking whitespace.
 * @param {string} str The string to check.
 * @return {boolean} Whether the string is all breaking whitespace.
 */
goog.string.isBreakingWhitespace = function(str) {
  return !/[^\t\n\r ]/.test(str);
};


/**
 * Checks if a string contains all letters.
 * @param {string} str string to check.
 * @return {boolean} True if `str` consists entirely of letters.
 */
goog.string.isAlpha = function(str) {
  return !/[^a-zA-Z]/.test(str);
};


/**
 * Checks if a string contains only numbers.
 * @param {*} str string to check. If not a string, it will be
 *     casted to one.
 * @return {boolean} True if `str` is numeric.
 */
goog.string.isNumeric = function(str) {
  return !/[^0-9]/.test(str);
};


/**
 * Checks if a string contains only numbers or letters.
 * @param {string} str string to check.
 * @return {boolean} True if `str` is alphanumeric.
 */
goog.string.isAlphaNumeric = function(str) {
  return !/[^a-zA-Z0-9]/.test(str);
};


/**
 * Checks if a character is a space character.
 * @param {string} ch Character to check.
 * @return {boolean} True if `ch` is a space.
 */
goog.string.isSpace = function(ch) {
  return ch == ' ';
};


/**
 * Checks if a character is a valid unicode character.
 * @param {string} ch Character to check.
 * @return {boolean} True if `ch` is a valid unicode character.
 */
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= ' ' && ch <= '~' ||
      ch >= '\u0080' && ch <= '\uFFFD';
};


/**
 * Takes a string and replaces newlines with a space. Multiple lines are
 * replaced with a single space.
 * @param {string} str The string from which to strip newlines.
 * @return {string} A copy of `str` stripped of newlines.
 */
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, ' ');
};


/**
 * Replaces Windows and Mac new lines with unix style: \r or \r\n with \n.
 * @param {string} str The string to in which to canonicalize newlines.
 * @return {string} `str` A copy of {@code} with canonicalized newlines.
 */
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, '\n');
};


/**
 * Normalizes whitespace in a string, replacing all whitespace chars with
 * a space.
 * @param {string} str The string in which to normalize whitespace.
 * @return {string} A copy of `str` with all whitespace normalized.
 */
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, ' ');
};


/**
 * Normalizes spaces in a string, replacing all consecutive spaces and tabs
 * with a single space. Replaces non-breaking space with a space.
 * @param {string} str The string in which to normalize spaces.
 * @return {string} A copy of `str` with all consecutive spaces and tabs
 *    replaced with a single space.
 */
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, ' ');
};


/**
 * Removes the breaking spaces from the left and right of the string and
 * collapses the sequences of breaking spaces in the middle into single spaces.
 * The original and the result strings render the same way in HTML.
 * @param {string} str A string in which to collapse spaces.
 * @return {string} Copy of the string with normalized breaking spaces.
 */
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, ' ')
      .replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, '');
};


/**
 * Trims white spaces to the left and right of a string.
 * @param {string} str The string to trim.
 * @return {string} A trimmed copy of `str`.
 */
goog.string.trim =
    (goog.TRUSTED_SITE && String.prototype.trim) ? function(str) {
      return str.trim();
    } : function(str) {
      // Since IE doesn't include non-breaking-space (0xa0) in their \s
      // character class (as required by section 7.2 of the ECMAScript spec),
      // we explicitly include it in the regexp to enforce consistent
      // cross-browser behavior.
      // NOTE: We don't use String#replace because it might have side effects
      // causing this function to not compile to 0 bytes.
      return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(str)[1];
    };


/**
 * Trims whitespaces at the left end of a string.
 * @param {string} str The string to left trim.
 * @return {string} A trimmed copy of `str`.
 */
goog.string.trimLeft = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+/, '');
};


/**
 * Trims whitespaces at the right end of a string.
 * @param {string} str The string to right trim.
 * @return {string} A trimmed copy of `str`.
 */
goog.string.trimRight = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+$/, '');
};


/**
 * A string comparator that ignores case.
 * -1 = str1 less than str2
 *  0 = str1 equals str2
 *  1 = str1 greater than str2
 *
 * @param {string} str1 The string to compare.
 * @param {string} str2 The string to compare `str1` to.
 * @return {number} The comparator result, as described above.
 */
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();

  if (test1 < test2) {
    return -1;
  } else if (test1 == test2) {
    return 0;
  } else {
    return 1;
  }
};


/**
 * Compares two strings interpreting their numeric substrings as numbers.
 *
 * @param {string} str1 First string.
 * @param {string} str2 Second string.
 * @param {!RegExp} tokenizerRegExp Splits a string into substrings of
 *     non-negative integers, non-numeric characters and optionally fractional
 *     numbers starting with a decimal point.
 * @return {number} Negative if str1 < str2, 0 is str1 == str2, positive if
 *     str1 > str2.
 * @private
 */
goog.string.numberAwareCompare_ = function(str1, str2, tokenizerRegExp) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return -1;
  }
  if (!str2) {
    return 1;
  }

  // Using match to split the entire string ahead of time turns out to be faster
  // for most inputs than using RegExp.exec or iterating over each character.
  var tokens1 = str1.toLowerCase().match(tokenizerRegExp);
  var tokens2 = str2.toLowerCase().match(tokenizerRegExp);

  var count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i];
    var b = tokens2[i];

    // Compare pairs of tokens, returning if one token sorts before the other.
    if (a != b) {
      // Only if both tokens are integers is a special comparison required.
      // Decimal numbers are sorted as strings (e.g., '.09' < '.1').
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }

  // If one string is a substring of the other, the shorter string sorts first.
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }

  // The two strings must be equivalent except for case (perfect equality is
  // tested at the head of the function.) Revert to default ASCII string
  // comparison to stabilize the sort.
  return str1 < str2 ? -1 : 1;
};


/**
 * String comparison function that handles non-negative integer numbers in a
 * way humans might expect. Using this function, the string 'File 2.jpg' sorts
 * before 'File 10.jpg', and 'Version 1.9' before 'Version 1.10'. The comparison
 * is mostly case-insensitive, though strings that are identical except for case
 * are sorted with the upper-case strings before lower-case.
 *
 * This comparison function is up to 50x slower than either the default or the
 * case-insensitive compare. It should not be used in time-critical code, but
 * should be fast enough to sort several hundred short strings (like filenames)
 * with a reasonable delay.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare `str1` to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.intAwareCompare = function(str1, str2) {
  return goog.string.numberAwareCompare_(str1, str2, /\d+|\D+/g);
};


/**
 * String comparison function that handles non-negative integer and fractional
 * numbers in a way humans might expect. Using this function, the string
 * 'File 2.jpg' sorts before 'File 10.jpg', and '3.14' before '3.2'. Equivalent
 * to {@link goog.string.intAwareCompare} apart from the way how it interprets
 * dots.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare `str1` to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.floatAwareCompare = function(str1, str2) {
  return goog.string.numberAwareCompare_(str1, str2, /\d+|\.\d+|\D+/g);
};


/**
 * Alias for {@link goog.string.floatAwareCompare}.
 *
 * @param {string} str1
 * @param {string} str2
 * @return {number}
 */
goog.string.numerateCompare = goog.string.floatAwareCompare;


/**
 * URL-encodes a string
 * @param {*} str The string to url-encode.
 * @return {string} An encoded copy of `str` that is safe for urls.
 *     Note that '#', ':', and other characters used to delimit portions
 *     of URLs *will* be encoded.
 */
goog.string.urlEncode = function(str) {
  return encodeURIComponent(String(str));
};


/**
 * URL-decodes the string. We need to specially handle '+'s because
 * the javascript library doesn't convert them to spaces.
 * @param {string} str The string to url decode.
 * @return {string} The decoded `str`.
 */
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, ' '));
};


/**
 * Converts \n to <br>s or <br />s.
 * @param {string} str The string in which to convert newlines.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} A copy of `str` with converted newlines.
 */
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
};


/**
 * Escapes double quote '"' and single quote '\'' characters in addition to
 * '&', '<', and '>' so that a string can be included in an HTML tag attribute
 * value within double or single quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * With goog.string.DETECT_DOUBLE_ESCAPING, this function escapes also the
 * lowercase letter "e".
 *
 * NOTE(pupius):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of `str`.
 */
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {

  if (opt_isLikelyToContainHtmlChars) {
    str = str.replace(goog.string.AMP_RE_, '&amp;')
              .replace(goog.string.LT_RE_, '&lt;')
              .replace(goog.string.GT_RE_, '&gt;')
              .replace(goog.string.QUOT_RE_, '&quot;')
              .replace(goog.string.SINGLE_QUOTE_RE_, '&#39;')
              .replace(goog.string.NULL_RE_, '&#0;');
    if (goog.string.DETECT_DOUBLE_ESCAPING) {
      str = str.replace(goog.string.E_RE_, '&#101;');
    }
    return str;

  } else {
    // quick test helps in the case when there are no chars to replace, in
    // worst case this makes barely a difference to the time taken
    if (!goog.string.ALL_RE_.test(str)) return str;

    // str.indexOf is faster than regex.test in this case
    if (str.indexOf('&') != -1) {
      str = str.replace(goog.string.AMP_RE_, '&amp;');
    }
    if (str.indexOf('<') != -1) {
      str = str.replace(goog.string.LT_RE_, '&lt;');
    }
    if (str.indexOf('>') != -1) {
      str = str.replace(goog.string.GT_RE_, '&gt;');
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.QUOT_RE_, '&quot;');
    }
    if (str.indexOf('\'') != -1) {
      str = str.replace(goog.string.SINGLE_QUOTE_RE_, '&#39;');
    }
    if (str.indexOf('\x00') != -1) {
      str = str.replace(goog.string.NULL_RE_, '&#0;');
    }
    if (goog.string.DETECT_DOUBLE_ESCAPING && str.indexOf('e') != -1) {
      str = str.replace(goog.string.E_RE_, '&#101;');
    }
    return str;
  }
};


/**
 * Regular expression that matches an ampersand, for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.AMP_RE_ = /&/g;


/**
 * Regular expression that matches a less than sign, for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.LT_RE_ = /</g;


/**
 * Regular expression that matches a greater than sign, for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.GT_RE_ = />/g;


/**
 * Regular expression that matches a double quote, for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.QUOT_RE_ = /"/g;


/**
 * Regular expression that matches a single quote, for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.SINGLE_QUOTE_RE_ = /'/g;


/**
 * Regular expression that matches null character, for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.NULL_RE_ = /\x00/g;


/**
 * Regular expression that matches a lowercase letter "e", for use in escaping.
 * @const {!RegExp}
 * @private
 */
goog.string.E_RE_ = /e/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @const {!RegExp}
 * @private
 */
goog.string.ALL_RE_ =
    (goog.string.DETECT_DOUBLE_ESCAPING ? /[\x00&<>"'e]/ : /[\x00&<>"']/);


/**
 * Unescapes an HTML string.
 *
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of `str`.
 */
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, '&')) {
    // We are careful not to use a DOM if we do not have one or we explicitly
    // requested non-DOM html unescaping.
    if (!goog.string.FORCE_NON_DOM_HTML_UNESCAPING &&
        'document' in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      // Fall back on pure XML entities
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};


/**
 * Unescapes a HTML string using the provided document.
 *
 * @param {string} str The string to unescape.
 * @param {!Document} document A document to use in escaping the string.
 * @return {string} An unescaped copy of `str`.
 */
goog.string.unescapeEntitiesWithDocument = function(str, document) {
  if (goog.string.contains(str, '&')) {
    return goog.string.unescapeEntitiesUsingDom_(str, document);
  }
  return str;
};


/**
 * Unescapes an HTML string using a DOM to resolve non-XML, non-numeric
 * entities. This function is XSS-safe and whitespace-preserving.
 * @private
 * @param {string} str The string to unescape.
 * @param {Document=} opt_document An optional document to use for creating
 *     elements. If this is not specified then the default window.document
 *     will be used.
 * @return {string} The unescaped `str` string.
 */
goog.string.unescapeEntitiesUsingDom_ = function(str, opt_document) {
  /** @type {!Object<string, string>} */
  var seen = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"'};
  var div;
  if (opt_document) {
    div = opt_document.createElement('div');
  } else {
    div = goog.global.document.createElement('div');
  }
  // Match as many valid entity characters as possible. If the actual entity
  // happens to be shorter, it will still work as innerHTML will return the
  // trailing characters unchanged. Since the entity characters do not include
  // open angle bracket, there is no chance of XSS from the innerHTML use.
  // Since no whitespace is passed to innerHTML, whitespace is preserved.
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    // Check for cached entity.
    var value = seen[s];
    if (value) {
      return value;
    }
    // Check for numeric entity.
    if (entity.charAt(0) == '#') {
      // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex numbers.
      var n = Number('0' + entity.substr(1));
      if (!isNaN(n)) {
        value = String.fromCharCode(n);
      }
    }
    // Fall back to innerHTML otherwise.
    if (!value) {
      // Append a non-entity character to avoid a bug in Webkit that parses
      // an invalid entity at the end of innerHTML text as the empty string.
      div.innerHTML = s + ' ';
      // Then remove the trailing character from the result.
      value = div.firstChild.nodeValue.slice(0, -1);
    }
    // Cache and return.
    return seen[s] = value;
  });
};


/**
 * Unescapes XML entities.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of `str`.
 */
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch (entity) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      default:
        if (entity.charAt(0) == '#') {
          // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex.
          var n = Number('0' + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        // For invalid entities we just return the entity
        return s;
    }
  });
};


/**
 * Regular expression that matches an HTML entity.
 * See also HTML5: Tokenization / Tokenizing character references.
 * @private
 * @type {!RegExp}
 */
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;


/**
 * Do escaping of whitespace to preserve spatial formatting. We use character
 * entity #160 to make it safer for xml.
 * @param {string} str The string in which to escape whitespace.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} An escaped copy of `str`.
 */
goog.string.whitespaceEscape = function(str, opt_xml) {
  // This doesn't use goog.string.preserveSpaces for backwards compatibility.
  return goog.string.newLineToBr(str.replace(/  /g, ' &#160;'), opt_xml);
};


/**
 * Preserve spaces that would be otherwise collapsed in HTML by replacing them
 * with non-breaking space Unicode characters.
 * @param {string} str The string in which to preserve whitespace.
 * @return {string} A copy of `str` with preserved whitespace.
 */
goog.string.preserveSpaces = function(str) {
  return str.replace(/(^|[\n ]) /g, '$1' + goog.string.Unicode.NBSP);
};


/**
 * Strip quote characters around a string.  The second argument is a string of
 * characters to treat as quotes.  This can be a single character or a string of
 * multiple character and in that case each of those are treated as possible
 * quote characters. For example:
 *
 * <pre>
 * goog.string.stripQuotes('"abc"', '"`') --> 'abc'
 * goog.string.stripQuotes('`abc`', '"`') --> 'abc'
 * </pre>
 *
 * @param {string} str The string to strip.
 * @param {string} quoteChars The quote characters to strip.
 * @return {string} A copy of `str` without the quotes.
 */
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0; i < length; i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};


/**
 * Truncates a string to a certain length and adds '...' if necessary.  The
 * length also accounts for the ellipsis, so a maximum length of 10 and a string
 * 'Hello World!' produces 'Hello W...'.
 * @param {string} str The string to truncate.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cut off in the middle.
 * @return {string} The truncated `str` string.
 */
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    str = str.substring(0, chars - 3) + '...';
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Truncate a string in the middle, adding "..." if necessary,
 * and favoring the beginning of the string.
 * @param {string} str The string to truncate the middle of.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cutoff in the middle.
 * @param {number=} opt_trailingChars Optional number of trailing characters to
 *     leave at the end of the string, instead of truncating as close to the
 *     middle as possible.
 * @return {string} A truncated copy of `str`.
 */
goog.string.truncateMiddle = function(
    str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (opt_trailingChars && str.length > chars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + '...' + str.substring(endPoint);
  } else if (str.length > chars) {
    // Favor the beginning of the string:
    var half = Math.floor(chars / 2);
    var endPos = str.length - half;
    half += chars % 2;
    str = str.substring(0, half) + '...' + str.substring(endPos);
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Special chars that need to be escaped for goog.string.quote.
 * @private {!Object<string, string>}
 */
goog.string.specialEscapeChars_ = {
  '\0': '\\0',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\x0B': '\\x0B',  // '\v' is not supported in JScript
  '"': '\\"',
  '\\': '\\\\',
  // To support the use case of embedding quoted strings inside of script
  // tags, we have to make sure HTML comments and opening/closing script tags do
  // not appear in the resulting string. The specific strings that must be
  // escaped are documented at:
  // http://www.w3.org/TR/html51/semantics.html#restrictions-for-contents-of-script-elements
  '<': '\x3c'
};


/**
 * Character mappings used internally for goog.string.escapeChar.
 * @private {!Object<string, string>}
 */
goog.string.jsEscapeCache_ = {
  '\'': '\\\''
};


/**
 * Encloses a string in double quotes and escapes characters so that the
 * string is a valid JS string. The resulting string is safe to embed in
 * `<script>` tags as "<" is escaped.
 * @param {string} s The string to quote.
 * @return {string} A copy of `s` surrounded by double quotes.
 */
goog.string.quote = function(s) {
  s = String(s);
  var sb = ['"'];
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    var cc = ch.charCodeAt(0);
    sb[i + 1] = goog.string.specialEscapeChars_[ch] ||
        ((cc > 31 && cc < 127) ? ch : goog.string.escapeChar(ch));
  }
  sb.push('"');
  return sb.join('');
};


/**
 * Takes a string and returns the escaped string for that input string.
 * @param {string} str The string to escape.
 * @return {string} An escaped string representing `str`.
 */
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0; i < str.length; i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join('');
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\x0E".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing `c`.
 */
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }

  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }

  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    // tab is 9 but handled above
    if (cc < 256) {
      rv = '\\x';
      if (cc < 16 || cc > 256) {
        rv += '0';
      }
    } else {
      rv = '\\u';
      if (cc < 4096) {  // \u1000
        rv += '0';
      }
    }
    rv += cc.toString(16).toUpperCase();
  }

  return goog.string.jsEscapeCache_[c] = rv;
};


/**
 * Determines whether a string contains a substring.
 * @param {string} str The string to search.
 * @param {string} subString The substring to search for.
 * @return {boolean} Whether `str` contains `subString`.
 */
goog.string.contains = function(str, subString) {
  return str.indexOf(subString) != -1;
};


/**
 * Determines whether a string contains a substring, ignoring case.
 * @param {string} str The string to search.
 * @param {string} subString The substring to search for.
 * @return {boolean} Whether `str` contains `subString`.
 */
goog.string.caseInsensitiveContains = function(str, subString) {
  return goog.string.contains(str.toLowerCase(), subString.toLowerCase());
};


/**
 * Returns the non-overlapping occurrences of ss in s.
 * If either s or ss evalutes to false, then returns zero.
 * @param {string} s The string to look in.
 * @param {string} ss The string to look for.
 * @return {number} Number of occurrences of ss in s.
 */
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0;
};


/**
 * Removes a substring of a specified length at a specific
 * index in a string.
 * @param {string} s The base string from which to remove.
 * @param {number} index The index at which to remove the substring.
 * @param {number} stringLength The length of the substring to remove.
 * @return {string} A copy of `s` with the substring removed or the full
 *     string if nothing is removed or the input is invalid.
 */
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  // If the index is greater or equal to 0 then remove substring
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) +
        s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};


/**
 * Removes the first occurrence of a substring from a string.
 * @param {string} str The base string from which to remove.
 * @param {string} substr The string to remove.
 * @return {string} A copy of `str` with `substr` removed or the
 *     full string if nothing is removed.
 */
goog.string.remove = function(str, substr) {
  return str.replace(substr, '');
};


/**
 *  Removes all occurrences of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of `s` with `ss` removed or the full
 *      string if nothing is removed.
 */
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, '');
};


/**
 *  Replaces all occurrences of a substring of a string with a new substring.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to replace.
 *  @param {string} replacement The replacement string.
 *  @return {string} A copy of `s` with `ss` replaced by
 *      `replacement` or the original string if nothing is replaced.
 */
goog.string.replaceAll = function(s, ss, replacement) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, replacement.replace(/\$/g, '$$$$'));
};


/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of `s`.
 */
goog.string.regExpEscape = function(s) {
  return String(s)
      .replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1')
      .replace(/\x08/g, '\\x08');
};


/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing `length` repetitions of
 *     `string`.
 */
goog.string.repeat = (String.prototype.repeat) ? function(string, length) {
  // The native method is over 100 times faster than the alternative.
  return string.repeat(length);
} : function(string, length) {
  return new Array(length + 1).join(string);
};


/**
 * Pads number to given length and optionally rounds it to a given precision.
 * For example:
 * <pre>padNumber(1.25, 2, 3) -> '01.250'
 * padNumber(1.25, 2) -> '01.25'
 * padNumber(1.25, 2, 1) -> '01.3'
 * padNumber(1.25, 0) -> '1.25'</pre>
 *
 * @param {number} num The number to pad.
 * @param {number} length The desired length.
 * @param {number=} opt_precision The desired precision.
 * @return {string} `num` as a string with the given options.
 */
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf('.');
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat('0', Math.max(0, length - index)) + s;
};


/**
 * Returns a string representation of the given object, with
 * null and undefined being returned as the empty string.
 *
 * @param {*} obj The object to convert.
 * @return {string} A string representation of the `obj`.
 */
goog.string.makeSafe = function(obj) {
  return obj == null ? '' : String(obj);
};


/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {...*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of `var_args`.
 */
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};


/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) +
      Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};


/**
 * Compares two version numbers.
 *
 * @param {string|number} version1 Version of first item.
 * @param {string|number} version2 Version of second item.
 *
 * @return {number}  1 if `version1` is higher.
 *                   0 if arguments are equal.
 *                  -1 if `version2` is higher.
 */
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  // Trim leading and trailing whitespace and split the versions into
  // subversions.
  var v1Subs = goog.string.trim(String(version1)).split('.');
  var v2Subs = goog.string.trim(String(version2)).split('.');
  var subCount = Math.max(v1Subs.length, v2Subs.length);

  // Iterate over the subversions, as long as they appear to be equivalent.
  for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
    var v1Sub = v1Subs[subIdx] || '';
    var v2Sub = v2Subs[subIdx] || '';

    do {
      // Split the subversions into pairs of numbers and qualifiers (like 'b').
      // Two different RegExp objects are use to make it clear the code
      // is side-effect free
      var v1Comp = /(\d*)(\D*)(.*)/.exec(v1Sub) || ['', '', '', ''];
      var v2Comp = /(\d*)(\D*)(.*)/.exec(v2Sub) || ['', '', '', ''];
      // Break if there are no more matches.
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }

      // Parse the numeric part of the subversion. A missing number is
      // equivalent to 0.
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

      // Compare the subversion components. The number has the highest
      // precedence. Next, if the numbers are equal, a subversion without any
      // qualifier is always higher than a subversion with any qualifier. Next,
      // the qualifiers are compared as strings.
      order = goog.string.compareElements_(v1CompNum, v2CompNum) ||
          goog.string.compareElements_(
              v1Comp[2].length == 0, v2Comp[2].length == 0) ||
          goog.string.compareElements_(v1Comp[2], v2Comp[2]);
      // Stop as soon as an inequality is discovered.

      v1Sub = v1Comp[3];
      v2Sub = v2Comp[3];
    } while (order == 0);
  }

  return order;
};


/**
 * Compares elements of a version number.
 *
 * @param {string|number|boolean} left An element from a version number.
 * @param {string|number|boolean} right An element from a version number.
 *
 * @return {number}  1 if `left` is higher.
 *                   0 if arguments are equal.
 *                  -1 if `right` is higher.
 * @private
 */
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  }
  return 0;
};


/**
 * String hash function similar to java.lang.String.hashCode().
 * The hash code for a string is computed as
 * s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
 * where s[i] is the ith character of the string and n is the length of
 * the string. We mod the result to make it between 0 (inclusive) and 2^32
 * (exclusive).
 * @param {string} str A string.
 * @return {number} Hash value for `str`, between 0 (inclusive) and 2^32
 *  (exclusive). The empty string returns 0.
 */
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    // Normalize to 4 byte range, 0 ... 2^32.
    result = (31 * result + str.charCodeAt(i)) >>> 0;
  }
  return result;
};


/**
 * The most recent unique ID. |0 is equivalent to Math.floor in this case.
 * @type {number}
 * @private
 */
goog.string.uniqueStringCounter_ = Math.random() * 0x80000000 | 0;


/**
 * Generates and returns a string which is unique in the current document.
 * This is useful, for example, to create unique IDs for DOM elements.
 * @return {string} A unique id.
 */
goog.string.createUniqueString = function() {
  return 'goog_' + goog.string.uniqueStringCounter_++;
};


/**
 * Converts the supplied string to a number, which may be Infinity or NaN.
 * This function strips whitespace: (toNumber(' 123') === 123)
 * This function accepts scientific notation: (toNumber('1e1') === 10)
 *
 * This is better than Javascript's built-in conversions because, sadly:
 *     (Number(' ') === 0) and (parseFloat('123a') === 123)
 *
 * @param {string} str The string to convert.
 * @return {number} The number the supplied string represents, or NaN.
 */
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmptyOrWhitespace(str)) {
    return NaN;
  }
  return num;
};


/**
 * Returns whether the given string is lower camel case (e.g. "isFooBar").
 *
 * Note that this assumes the string is entirely letters.
 * @see http://en.wikipedia.org/wiki/CamelCase#Variations_and_synonyms
 *
 * @param {string} str String to test.
 * @return {boolean} Whether the string is lower camel case.
 */
goog.string.isLowerCamelCase = function(str) {
  return /^[a-z]+([A-Z][a-z]*)*$/.test(str);
};


/**
 * Returns whether the given string is upper camel case (e.g. "FooBarBaz").
 *
 * Note that this assumes the string is entirely letters.
 * @see http://en.wikipedia.org/wiki/CamelCase#Variations_and_synonyms
 *
 * @param {string} str String to test.
 * @return {boolean} Whether the string is upper camel case.
 */
goog.string.isUpperCamelCase = function(str) {
  return /^([A-Z][a-z]*)+$/.test(str);
};


/**
 * Converts a string from selector-case to camelCase (e.g. from
 * "multi-part-string" to "multiPartString"), useful for converting
 * CSS selectors and HTML dataset keys to their equivalent JS properties.
 * @param {string} str The string in selector-case form.
 * @return {string} The string in camelCase form.
 */
goog.string.toCamelCase = function(str) {
  return String(str).replace(
      /\-([a-z])/g, function(all, match) { return match.toUpperCase(); });
};


/**
 * Converts a string from camelCase to selector-case (e.g. from
 * "multiPartString" to "multi-part-string"), useful for converting JS
 * style and dataset properties to equivalent CSS selectors and HTML keys.
 * @param {string} str The string in camelCase form.
 * @return {string} The string in selector-case form.
 */
goog.string.toSelectorCase = function(str) {
  return String(str).replace(/([A-Z])/g, '-$1').toLowerCase();
};


/**
 * Converts a string into TitleCase. First character of the string is always
 * capitalized in addition to the first letter of every subsequent word.
 * Words are delimited by one or more whitespaces by default. Custom delimiters
 * can optionally be specified to replace the default, which doesn't preserve
 * whitespace delimiters and instead must be explicitly included if needed.
 *
 * Default delimiter => " ":
 *    goog.string.toTitleCase('oneTwoThree')    => 'OneTwoThree'
 *    goog.string.toTitleCase('one two three')  => 'One Two Three'
 *    goog.string.toTitleCase('  one   two   ') => '  One   Two   '
 *    goog.string.toTitleCase('one_two_three')  => 'One_two_three'
 *    goog.string.toTitleCase('one-two-three')  => 'One-two-three'
 *
 * Custom delimiter => "_-.":
 *    goog.string.toTitleCase('oneTwoThree', '_-.')       => 'OneTwoThree'
 *    goog.string.toTitleCase('one two three', '_-.')     => 'One two three'
 *    goog.string.toTitleCase('  one   two   ', '_-.')    => '  one   two   '
 *    goog.string.toTitleCase('one_two_three', '_-.')     => 'One_Two_Three'
 *    goog.string.toTitleCase('one-two-three', '_-.')     => 'One-Two-Three'
 *    goog.string.toTitleCase('one...two...three', '_-.') => 'One...Two...Three'
 *    goog.string.toTitleCase('one. two. three', '_-.')   => 'One. two. three'
 *    goog.string.toTitleCase('one-two.three', '_-.')     => 'One-Two.Three'
 *
 * @param {string} str String value in camelCase form.
 * @param {string=} opt_delimiters Custom delimiter character set used to
 *      distinguish words in the string value. Each character represents a
 *      single delimiter. When provided, default whitespace delimiter is
 *      overridden and must be explicitly included if needed.
 * @return {string} String value in TitleCase form.
 */
goog.string.toTitleCase = function(str, opt_delimiters) {
  var delimiters = goog.isString(opt_delimiters) ?
      goog.string.regExpEscape(opt_delimiters) :
      '\\s';

  // For IE8, we need to prevent using an empty character set. Otherwise,
  // incorrect matching will occur.
  delimiters = delimiters ? '|[' + delimiters + ']+' : '';

  var regexp = new RegExp('(^' + delimiters + ')([a-z])', 'g');
  return str.replace(
      regexp, function(all, p1, p2) { return p1 + p2.toUpperCase(); });
};


/**
 * Capitalizes a string, i.e. converts the first letter to uppercase
 * and all other letters to lowercase, e.g.:
 *
 * goog.string.capitalize('one')     => 'One'
 * goog.string.capitalize('ONE')     => 'One'
 * goog.string.capitalize('one two') => 'One two'
 *
 * Note that this function does not trim initial whitespace.
 *
 * @param {string} str String value to capitalize.
 * @return {string} String value with first letter in uppercase.
 */
goog.string.capitalize = function(str) {
  return String(str.charAt(0)).toUpperCase() +
      String(str.substr(1)).toLowerCase();
};


/**
 * Parse a string in decimal or hexidecimal ('0xFFFF') form.
 *
 * To parse a particular radix, please use parseInt(string, radix) directly. See
 * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/parseInt
 *
 * This is a wrapper for the built-in parseInt function that will only parse
 * numbers as base 10 or base 16.  Some JS implementations assume strings
 * starting with "0" are intended to be octal. ES3 allowed but discouraged
 * this behavior. ES5 forbids it.  This function emulates the ES5 behavior.
 *
 * For more information, see Mozilla JS Reference: http://goo.gl/8RiFj
 *
 * @param {string|number|null|undefined} value The value to be parsed.
 * @return {number} The number, parsed. If the string failed to parse, this
 *     will be NaN.
 */
goog.string.parseInt = function(value) {
  // Force finite numbers to strings.
  if (isFinite(value)) {
    value = String(value);
  }

  if (goog.isString(value)) {
    // If the string starts with '0x' or '-0x', parse as hex.
    return /^\s*-?0x/i.test(value) ? parseInt(value, 16) : parseInt(value, 10);
  }

  return NaN;
};


/**
 * Splits a string on a separator a limited number of times.
 *
 * This implementation is more similar to Python or Java, where the limit
 * parameter specifies the maximum number of splits rather than truncating
 * the number of results.
 *
 * See http://docs.python.org/2/library/stdtypes.html#str.split
 * See JavaDoc: http://goo.gl/F2AsY
 * See Mozilla reference: http://goo.gl/dZdZs
 *
 * @param {string} str String to split.
 * @param {string} separator The separator.
 * @param {number} limit The limit to the number of splits. The resulting array
 *     will have a maximum length of limit+1.  Negative numbers are the same
 *     as zero.
 * @return {!Array<string>} The string, split.
 */
goog.string.splitLimit = function(str, separator, limit) {
  var parts = str.split(separator);
  var returnVal = [];

  // Only continue doing this while we haven't hit the limit and we have
  // parts left.
  while (limit > 0 && parts.length) {
    returnVal.push(parts.shift());
    limit--;
  }

  // If there are remaining parts, append them to the end.
  if (parts.length) {
    returnVal.push(parts.join(separator));
  }

  return returnVal;
};


/**
 * Finds the characters to the right of the last instance of any separator
 *
 * This function is similar to goog.string.path.baseName, except it can take a
 * list of characters to split the string on. It will return the rightmost
 * grouping of characters to the right of any separator as a left-to-right
 * oriented string.
 *
 * @see goog.string.path.baseName
 * @param {string} str The string
 * @param {string|!Array<string>} separators A list of separator characters
 * @return {string} The last part of the string with respect to the separators
 */
goog.string.lastComponent = function(str, separators) {
  if (!separators) {
    return str;
  } else if (typeof separators == 'string') {
    separators = [separators];
  }

  var lastSeparatorIndex = -1;
  for (var i = 0; i < separators.length; i++) {
    if (separators[i] == '') {
      continue;
    }
    var currentSeparatorIndex = str.lastIndexOf(separators[i]);
    if (currentSeparatorIndex > lastSeparatorIndex) {
      lastSeparatorIndex = currentSeparatorIndex;
    }
  }
  if (lastSeparatorIndex == -1) {
    return str;
  }
  return str.slice(lastSeparatorIndex + 1);
};


/**
 * Computes the Levenshtein edit distance between two strings.
 * @param {string} a
 * @param {string} b
 * @return {number} The edit distance between the two strings.
 */
goog.string.editDistance = function(a, b) {
  var v0 = [];
  var v1 = [];

  if (a == b) {
    return 0;
  }

  if (!a.length || !b.length) {
    return Math.max(a.length, b.length);
  }

  for (var i = 0; i < b.length + 1; i++) {
    v0[i] = i;
  }

  for (var i = 0; i < a.length; i++) {
    v1[0] = i + 1;

    for (var j = 0; j < b.length; j++) {
      var cost = Number(a[i] != b[j]);
      // Cost for the substring is the minimum of adding one character, removing
      // one character, or a swap.
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }

    for (var j = 0; j < v0.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v1[b.length];
};

//javascript/closure/format/emailaddress.js
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provides functions to parse and manipulate email addresses.
 *
 * @author jonp@google.com (Jon Perlow)
 * @author willscott@google.com (Will Scott)
 */

goog.provide('goog.format.EmailAddress');

goog.require('goog.string');



/**
 * Formats an email address string for display, and allows for extraction of
 * the individual components of the address.
 * @param {string=} opt_address The email address.
 * @param {string=} opt_name The name associated with the email address.
 * @constructor
 */
goog.format.EmailAddress = function(opt_address, opt_name) {
  /**
   * The name or personal string associated with the address.
   * @type {string}
   * @private
   */
  this.name_ = opt_name || '';

  /**
   * The email address.
   * @type {string}
   * @protected
   */
  this.address = opt_address || '';
};


/**
 * Match string for opening tokens.
 * @type {string}
 * @private
 */
goog.format.EmailAddress.OPENERS_ = '"<([';


/**
 * Match string for closing tokens.
 * @type {string}
 * @private
 */
goog.format.EmailAddress.CLOSERS_ = '">)]';


/**
 * Match string for characters that require display names to be quoted and are
 * not address separators.
 * @type {string}
 * @const
 * @package
 */
goog.format.EmailAddress.SPECIAL_CHARS = '()<>@:\\\".[]';


/**
 * Match string for address separators.
 * @type {string}
 * @const
 * @private
 */
goog.format.EmailAddress.ADDRESS_SEPARATORS_ = ',;';


/**
 * Match string for characters that, when in a display name, require it to be
 * quoted.
 * @type {string}
 * @const
 * @private
 */
goog.format.EmailAddress.CHARS_REQUIRE_QUOTES_ =
    goog.format.EmailAddress.SPECIAL_CHARS +
    goog.format.EmailAddress.ADDRESS_SEPARATORS_;


/**
 * A RegExp to match all double quotes.  Used in cleanAddress().
 * @type {RegExp}
 * @private
 */
goog.format.EmailAddress.ALL_DOUBLE_QUOTES_ = /\"/g;


/**
 * A RegExp to match escaped double quotes.  Used in parse().
 * @type {RegExp}
 * @private
 */
goog.format.EmailAddress.ESCAPED_DOUBLE_QUOTES_ = /\\\"/g;


/**
 * A RegExp to match all backslashes.  Used in cleanAddress().
 * @type {RegExp}
 * @private
 */
goog.format.EmailAddress.ALL_BACKSLASHES_ = /\\/g;


/**
 * A RegExp to match escaped backslashes.  Used in parse().
 * @type {RegExp}
 * @private
 */
goog.format.EmailAddress.ESCAPED_BACKSLASHES_ = /\\\\/g;


/**
 * A string representing the RegExp for the local part of an email address.
 * @private {string}
 */
goog.format.EmailAddress.LOCAL_PART_REGEXP_STR_ =
    '[+a-zA-Z0-9_.!#$%&\'*\\/=?^`{|}~-]+';


/**
 * A string representing the RegExp for the domain part of an email address.
 * @private {string}
 */
goog.format.EmailAddress.DOMAIN_PART_REGEXP_STR_ =
    '([a-zA-Z0-9-]+\\.)+[a-zA-Z0-9]{2,63}';


/**
 * A RegExp to match the local part of an email address.
 * @private {!RegExp}
 */
goog.format.EmailAddress.LOCAL_PART_ =
    new RegExp('^' + goog.format.EmailAddress.LOCAL_PART_REGEXP_STR_ + '$');


/**
 * A RegExp to match the domain part of an email address.
 * @private {!RegExp}
 */
goog.format.EmailAddress.DOMAIN_PART_ =
    new RegExp('^' + goog.format.EmailAddress.DOMAIN_PART_REGEXP_STR_ + '$');


/**
 * A RegExp to match an email address.
 * @private {!RegExp}
 */
goog.format.EmailAddress.EMAIL_ADDRESS_ = new RegExp(
    '^' + goog.format.EmailAddress.LOCAL_PART_REGEXP_STR_ + '@' +
    goog.format.EmailAddress.DOMAIN_PART_REGEXP_STR_ + '$');


/**
 * Get the name associated with the email address.
 * @return {string} The name or personal portion of the address.
 * @final
 */
goog.format.EmailAddress.prototype.getName = function() {
  return this.name_;
};


/**
 * Get the email address.
 * @return {string} The email address.
 * @final
 */
goog.format.EmailAddress.prototype.getAddress = function() {
  return this.address;
};


/**
 * Set the name associated with the email address.
 * @param {string} name The name to associate.
 * @final
 */
goog.format.EmailAddress.prototype.setName = function(name) {
  this.name_ = name;
};


/**
 * Set the email address.
 * @param {string} address The email address.
 * @final
 */
goog.format.EmailAddress.prototype.setAddress = function(address) {
  this.address = address;
};


/**
 * Return the address in a standard format:
 *  - remove extra spaces.
 *  - Surround name with quotes if it contains special characters.
 * @return {string} The cleaned address.
 * @override
 */
goog.format.EmailAddress.prototype.toString = function() {
  return this.toStringInternal(goog.format.EmailAddress.CHARS_REQUIRE_QUOTES_);
};


/**
 * Check if a display name requires quoting.
 * @param {string} name The display name
 * @param {string} specialChars String that contains the characters that require
 *  the display name to be quoted. This may change based in whereas we are
 *  in EAI context or not.
 * @return {boolean}
 * @private
 */
goog.format.EmailAddress.isQuoteNeeded_ = function(name, specialChars) {
  for (var i = 0; i < specialChars.length; i++) {
    var specialChar = specialChars[i];
    if (goog.string.contains(name, specialChar)) {
      return true;
    }
  }
  return false;
};


/**
 * Return the address in a standard format:
 *  - remove extra spaces.
 *  - Surround name with quotes if it contains special characters.
 * @param {string} specialChars String that contains the characters that require
 *  the display name to be quoted.
 * @return {string} The cleaned address.
 * @protected
 */
goog.format.EmailAddress.prototype.toStringInternal = function(specialChars) {
  var name = this.getName();

  // We intentionally remove double quotes in the name because escaping
  // them to \" looks ugly.
  name = name.replace(goog.format.EmailAddress.ALL_DOUBLE_QUOTES_, '');

  // If the name has special characters, we need to quote it and escape \'s.
  if (goog.format.EmailAddress.isQuoteNeeded_(name, specialChars)) {
    name = '"' +
        name.replace(goog.format.EmailAddress.ALL_BACKSLASHES_, '\\\\') + '"';
  }

  if (name == '') {
    return this.address;
  }
  if (this.address == '') {
    return name;
  }
  return name + ' <' + this.address + '>';
};


/**
 * Determines if the current object is a valid email address.
 * @return {boolean} Whether the email address is valid.
 */
goog.format.EmailAddress.prototype.isValid = function() {
  return goog.format.EmailAddress.isValidAddrSpec(this.address);
};


/**
 * Checks if the provided string is a valid email address. Supports both
 * simple email addresses (address specs) and addresses that contain display
 * names.
 * @param {string} str The email address to check.
 * @return {boolean} Whether the provided string is a valid address.
 */
goog.format.EmailAddress.isValidAddress = function(str) {
  return goog.format.EmailAddress.parse(str).isValid();
};


/**
 * Checks if the provided string is a valid address spec (local@domain.com).
 * @param {string} str The email address to check.
 * @return {boolean} Whether the provided string is a valid address spec.
 */
goog.format.EmailAddress.isValidAddrSpec = function(str) {
  // This is a fairly naive implementation, but it covers 99% of use cases.
  // For more details, see http://en.wikipedia.org/wiki/Email_address#Syntax
  return goog.format.EmailAddress.EMAIL_ADDRESS_.test(str);
};


/**
 * Checks if the provided string is a valid local part (part before the '@') of
 * an email address.
 * @param {string} str The local part to check.
 * @return {boolean} Whether the provided string is a valid local part.
 */
goog.format.EmailAddress.isValidLocalPartSpec = function(str) {
  return goog.format.EmailAddress.LOCAL_PART_.test(str);
};


/**
 * Checks if the provided string is a valid domain part (part after the '@') of
 * an email address.
 * @param {string} str The domain part to check.
 * @return {boolean} Whether the provided string is a valid domain part.
 */
goog.format.EmailAddress.isValidDomainPartSpec = function(str) {
  return goog.format.EmailAddress.DOMAIN_PART_.test(str);
};


/**
 * Parses an email address of the form "name" &lt;address&gt; ("name" is
 * optional) into an email address.
 * @param {string} addr The address string.
 * @param {function(new: goog.format.EmailAddress, string=,string=)} ctor
 *     EmailAddress constructor to instantiate the output address.
 * @return {!goog.format.EmailAddress} The parsed address.
 * @protected
 */
goog.format.EmailAddress.parseInternal = function(addr, ctor) {
  // TODO(ecattell): Strip bidi markers.
  var name = '';
  var address = '';
  for (var i = 0; i < addr.length;) {
    var token = goog.format.EmailAddress.getToken_(addr, i);
    if (token.charAt(0) == '<' && token.indexOf('>') != -1) {
      var end = token.indexOf('>');
      address = token.substring(1, end);
    } else if (address == '') {
      name += token;
    }
    i += token.length;
  }

  // Check if it's a simple email address of the form "jlim@google.com".
  if (address == '' && name.indexOf('@') != -1) {
    address = name;
    name = '';
  }

  name = goog.string.collapseWhitespace(name);
  name = goog.string.stripQuotes(name, '\'');
  name = goog.string.stripQuotes(name, '"');
  // Replace escaped quotes and slashes.
  name = name.replace(goog.format.EmailAddress.ESCAPED_DOUBLE_QUOTES_, '"');
  name = name.replace(goog.format.EmailAddress.ESCAPED_BACKSLASHES_, '\\');
  address = goog.string.collapseWhitespace(address);
  return new ctor(address, name);
};


/**
 * Parses an email address of the form "name" &lt;address&gt; into
 * an email address.
 * @param {string} addr The address string.
 * @return {!goog.format.EmailAddress} The parsed address.
 */
goog.format.EmailAddress.parse = function(addr) {
  return goog.format.EmailAddress.parseInternal(addr, goog.format.EmailAddress);
};


/**
 * Parse a string containing email addresses of the form
 * "name" &lt;address&gt; into an array of email addresses.
 * @param {string} str The address list.
 * @param {function(string)} parser The parser to employ.
 * @param {function(string):boolean} separatorChecker Accepts a character and
 *    returns whether it should be considered an address separator.
 * @return {!Array<!goog.format.EmailAddress>} The parsed emails.
 * @protected
 */
goog.format.EmailAddress.parseListInternal = function(
    str, parser, separatorChecker) {
  var result = [];
  var email = '';
  var token;

  // Remove non-UNIX-style newlines that would otherwise cause getToken_ to
  // choke. Remove multiple consecutive whitespace characters for the same
  // reason.
  str = goog.string.collapseWhitespace(str);

  for (var i = 0; i < str.length;) {
    token = goog.format.EmailAddress.getToken_(str, i);
    if (separatorChecker(token) || (token == ' ' && parser(email).isValid())) {
      if (!goog.string.isEmptyOrWhitespace(email)) {
        result.push(parser(email));
      }
      email = '';
      i++;
      continue;
    }
    email += token;
    i += token.length;
  }

  // Add the final token.
  if (!goog.string.isEmptyOrWhitespace(email)) {
    result.push(parser(email));
  }
  return result;
};


/**
 * Parses a string containing email addresses of the form
 * "name" &lt;address&gt; into an array of email addresses.
 * @param {string} str The address list.
 * @return {!Array<!goog.format.EmailAddress>} The parsed emails.
 */
goog.format.EmailAddress.parseList = function(str) {
  return goog.format.EmailAddress.parseListInternal(
      str, goog.format.EmailAddress.parse,
      goog.format.EmailAddress.isAddressSeparator);
};


/**
 * Get the next token from a position in an address string.
 * @param {string} str the string.
 * @param {number} pos the position.
 * @return {string} the token.
 * @private
 */
goog.format.EmailAddress.getToken_ = function(str, pos) {
  var ch = str.charAt(pos);
  var p = goog.format.EmailAddress.OPENERS_.indexOf(ch);
  if (p == -1) {
    return ch;
  }
  if (goog.format.EmailAddress.isEscapedDlQuote_(str, pos)) {
    // If an opener is an escaped quote we do not treat it as a real opener
    // and keep accumulating the token.
    return ch;
  }
  var closerChar = goog.format.EmailAddress.CLOSERS_.charAt(p);
  var endPos = str.indexOf(closerChar, pos + 1);

  // If the closer is a quote we go forward skipping escaped quotes until we
  // hit the real closing one.
  while (endPos >= 0 &&
         goog.format.EmailAddress.isEscapedDlQuote_(str, endPos)) {
    endPos = str.indexOf(closerChar, endPos + 1);
  }
  var token = (endPos >= 0) ? str.substring(pos, endPos + 1) : ch;
  return token;
};


/**
 * Checks if the character in the current position is an escaped double quote
 * ( \" ).
 * @param {string} str the string.
 * @param {number} pos the position.
 * @return {boolean} true if the char is escaped double quote.
 * @private
 */
goog.format.EmailAddress.isEscapedDlQuote_ = function(str, pos) {
  if (str.charAt(pos) != '"') {
    return false;
  }
  var slashCount = 0;
  for (var idx = pos - 1; idx >= 0 && str.charAt(idx) == '\\'; idx--) {
    slashCount++;
  }
  return ((slashCount % 2) != 0);
};


/**
 * @param {string} ch The character to test.
 * @return {boolean} Whether the provided character is an address separator.
 */
goog.format.EmailAddress.isAddressSeparator = function(ch) {
  return goog.string.contains(goog.format.EmailAddress.ADDRESS_SEPARATORS_, ch);
};

//javascript/closure/debug/error.js
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provides a base class for custom Error objects such that the
 * stack is correctly maintained.
 *
 * You should never need to throw goog.debug.Error(msg) directly, Error(msg) is
 * sufficient.
 *
 * @author pupius@google.com (Daniel Pupius)
 */

goog.provide('goog.debug.Error');



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
goog.debug.Error = function(opt_msg) {

  // Attempt to ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, goog.debug.Error);
  } else {
    var stack = new Error().stack;
    if (stack) {
      /** @override */
      this.stack = stack;
    }
  }

  if (opt_msg) {
    /** @override */
    this.message = String(opt_msg);
  }

  /**
   * Whether to report this error to the server. Setting this to false will
   * cause the error reporter to not report the error back to the server,
   * which can be useful if the client knows that the error has already been
   * logged on the server.
   * @type {boolean}
   */
  this.reportErrorToServer = true;
};
goog.inherits(goog.debug.Error, Error);


/** @override */
goog.debug.Error.prototype.name = 'CustomError';

//javascript/closure/dom/nodetype.js
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of goog.dom.NodeType.
 */

goog.provide('goog.dom.NodeType');


/**
 * Constants for the nodeType attribute in the Node interface.
 *
 * These constants match those specified in the Node interface. These are
 * usually present on the Node object in recent browsers, but not in older
 * browsers (specifically, early IEs) and thus are given here.
 *
 * In some browsers (early IEs), these are not defined on the Node object,
 * so they are provided here.
 *
 * See http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-1950641247
 * @enum {number}
 */
goog.dom.NodeType = {
  ELEMENT: 1,
  ATTRIBUTE: 2,
  TEXT: 3,
  CDATA_SECTION: 4,
  ENTITY_REFERENCE: 5,
  ENTITY: 6,
  PROCESSING_INSTRUCTION: 7,
  COMMENT: 8,
  DOCUMENT: 9,
  DOCUMENT_TYPE: 10,
  DOCUMENT_FRAGMENT: 11,
  NOTATION: 12
};

//javascript/closure/asserts/asserts.js
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities to check the preconditions, postconditions and
 * invariants runtime.
 *
 * Methods in this package should be given special treatment by the compiler
 * for type-inference. For example, <code>goog.asserts.assert(foo)</code>
 * will restrict <code>foo</code> to a truthy value.
 *
 * The compiler has an option to disable asserts. So code like:
 * <code>
 * var x = goog.asserts.assert(foo()); goog.asserts.assert(bar());
 * </code>
 * will be transformed into:
 * <code>
 * var x = foo();
 * </code>
 * The compiler will leave in foo() (because its return value is used),
 * but it will remove bar() because it assumes it does not have side-effects.
 *
 * @author pallosp@google.com (Peter Pallos)
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('goog.asserts');
goog.provide('goog.asserts.AssertionError');

goog.require('goog.debug.Error');
goog.require('goog.dom.NodeType');


/**
 * @define {boolean} Whether to strip out asserts or to leave them in.
 */
goog.define('goog.asserts.ENABLE_ASSERTS', goog.DEBUG);



/**
 * Error object for failed assertions.
 * @param {string} messagePattern The pattern that was used to form message.
 * @param {!Array<*>} messageArgs The items to substitute into the pattern.
 * @constructor
 * @extends {goog.debug.Error}
 * @final
 */
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  goog.debug.Error.call(this, goog.asserts.subs_(messagePattern, messageArgs));

  /**
   * The message pattern used to format the error message. Error handlers can
   * use this to uniquely identify the assertion.
   * @type {string}
   */
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);


/** @override */
goog.asserts.AssertionError.prototype.name = 'AssertionError';


/**
 * The default error handler.
 * @param {!goog.asserts.AssertionError} e The exception to be handled.
 */
goog.asserts.DEFAULT_ERROR_HANDLER = function(e) {
  throw e;
};


/**
 * The handler responsible for throwing or logging assertion errors.
 * @private {function(!goog.asserts.AssertionError)}
 */
goog.asserts.errorHandler_ = goog.asserts.DEFAULT_ERROR_HANDLER;


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} pattern The string containing the pattern.
 * @param {!Array<*>} subs The items to substitute into the pattern.
 * @return {string} A copy of `str` in which each occurrence of
 *     {@code %s} has been replaced an argument from `var_args`.
 * @private
 */
goog.asserts.subs_ = function(pattern, subs) {
  var splitParts = pattern.split('%s');
  var returnString = '';

  // Replace up to the last split part. We are inserting in the
  // positions between split parts.
  var subLast = splitParts.length - 1;
  for (var i = 0; i < subLast; i++) {
    // keep unsupplied as '%s'
    var sub = (i < subs.length) ? subs[i] : '%s';
    returnString += splitParts[i] + sub;
  }
  return returnString + splitParts[subLast];
};


/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {Array<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {Array<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 * @private
 */
goog.asserts.doAssertFailure_ = function(
    defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = 'Assertion failed';
  if (givenMessage) {
    message += ': ' + givenMessage;
    var args = givenArgs;
  } else if (defaultMessage) {
    message += ': ' + defaultMessage;
    args = defaultArgs;
  }
  // The '' + works around an Opera 10 bug in the unit tests. Without it,
  // a stack trace is added to var message above. With this, a stack trace is
  // not added until this line (it causes the extra garbage to be added after
  // the assertion message instead of in the middle of it).
  var e = new goog.asserts.AssertionError('' + message, args || []);
  goog.asserts.errorHandler_(e);
};


/**
 * Sets a custom error handler that can be used to customize the behavior of
 * assertion failures, for example by turning all assertion failures into log
 * messages.
 * @param {function(!goog.asserts.AssertionError)} errorHandler
 */
goog.asserts.setErrorHandler = function(errorHandler) {
  if (goog.asserts.ENABLE_ASSERTS) {
    goog.asserts.errorHandler_ = errorHandler;
  }
};


/**
 * Checks if the condition evaluates to true if goog.asserts.ENABLE_ASSERTS is
 * true.
 * @template T
 * @param {T} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {T} The value of the condition.
 * @throws {goog.asserts.AssertionError} When the condition evaluates to false.
 */
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_(
        '', null, opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};


/**
 * Fails if goog.asserts.ENABLE_ASSERTS is true. This function is useful in case
 * when we want to add a check in the unreachable area like switch-case
 * statement:
 *
 * <pre>
 *  switch(type) {
 *    case FOO: doSomething(); break;
 *    case BAR: doSomethingElse(); break;
 *    default: goog.asserts.fail('Unrecognized type: ' + type);
 *      // We have only 2 types - "default:" section is unreachable code.
 *  }
 * </pre>
 *
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} Failure.
 */
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    goog.asserts.errorHandler_(
        new goog.asserts.AssertionError(
            'Failure' + (opt_message ? ': ' + opt_message : ''),
            Array.prototype.slice.call(arguments, 1)));
  }
};


/**
 * Checks if the value is a number if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {number} The value, guaranteed to be a number when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 */
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_(
        'Expected number but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {number} */ (value);
};


/**
 * Checks if the value is a string if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a string.
 */
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_(
        'Expected string but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is a function if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Function} The value, guaranteed to be a function when asserts
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a function.
 */
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_(
        'Expected function but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Function} */ (value);
};


/**
 * Checks if the value is an Object if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Object} The value, guaranteed to be a non-null object.
 * @throws {goog.asserts.AssertionError} When the value is not an object.
 */
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_(
        'Expected object but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Object} */ (value);
};


/**
 * Checks if the value is an Array if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Array<?>} The value, guaranteed to be a non-null array.
 * @throws {goog.asserts.AssertionError} When the value is not an array.
 */
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_(
        'Expected array but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Array<?>} */ (value);
};


/**
 * Checks if the value is a boolean if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {boolean} The value, guaranteed to be a boolean when asserts are
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a boolean.
 */
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_(
        'Expected boolean but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {boolean} */ (value);
};


/**
 * Checks if the value is a DOM Element if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Element} The value, likely to be a DOM Element when asserts are
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not an Element.
 */
goog.asserts.assertElement = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS &&
      (!goog.isObject(value) || value.nodeType != goog.dom.NodeType.ELEMENT)) {
    goog.asserts.doAssertFailure_(
        'Expected Element but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Element} */ (value);
};


/**
 * Checks if the value is an instance of the user-defined type if
 * goog.asserts.ENABLE_ASSERTS is true.
 *
 * The compiler may tighten the type returned by this function.
 *
 * @param {?} value The value to check.
 * @param {function(new: T, ...)} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not an instance of
 *     type.
 * @return {T}
 * @template T
 */
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_(
        'Expected instanceof %s but got %s.',
        [goog.asserts.getType_(type), goog.asserts.getType_(value)],
        opt_message, Array.prototype.slice.call(arguments, 3));
  }
  return value;
};


/**
 * Checks whether the value is a finite number, if goog.asserts.ENABLE_ASSERTS
 * is true.
 *
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not a number, or is
 *     a non-finite number such as NaN, Infinity or -Infinity.
 * @return {number} The value initially passed in.
 */
goog.asserts.assertFinite = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS &&
      (typeof value != 'number' || !isFinite(value))) {
    goog.asserts.doAssertFailure_(
        'Expected %s to be a finite number but it is not.', [value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {number} */ (value);
};

/**
 * Checks that no enumerable keys are present in Object.prototype. Such keys
 * would break most code that use {@code for (var ... in ...)} loops.
 */
goog.asserts.assertObjectPrototypeIsIntact = function() {
  for (var key in Object.prototype) {
    goog.asserts.fail(key + ' should not be enumerable in Object.prototype.');
  }
};


/**
 * Returns the type of a value. If a constructor is passed, and a suitable
 * string cannot be found, 'unknown type name' will be returned.
 * @param {*} value A constructor, object, or primitive.
 * @return {string} The best display name for the value, or 'unknown type name'.
 * @private
 */
goog.asserts.getType_ = function(value) {
  if (value instanceof Function) {
    return value.displayName || value.name || 'unknown type name';
  } else if (value instanceof Object) {
    return /** @type {string} */ (value.constructor.displayName) ||
        value.constructor.name || Object.prototype.toString.call(value);
  } else {
    return value === null ? 'null' : typeof value;
  }
};

//javascript/closure/array/array.js
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating arrays.
 *
 * @author pupius@google.com (Daniel Pupius)
 * @author arv@google.com (Erik Arvidsson)
 * @author pallosp@google.com (Peter Pallos)
 */


goog.provide('goog.array');

goog.require('goog.asserts');


/**
 * @define {boolean} NATIVE_ARRAY_PROTOTYPES indicates whether the code should
 * rely on Array.prototype functions, if available.
 *
 * The Array.prototype functions can be defined by external libraries like
 * Prototype and setting this flag to false forces closure to use its own
 * goog.array implementation.
 *
 * If your javascript can be loaded by a third party site and you are wary about
 * relying on the prototype functions, specify
 * "--define goog.NATIVE_ARRAY_PROTOTYPES=false" to the JSCompiler.
 *
 * Setting goog.TRUSTED_SITE to false will automatically set
 * NATIVE_ARRAY_PROTOTYPES to false.
 */
goog.define('goog.NATIVE_ARRAY_PROTOTYPES', goog.TRUSTED_SITE);


/**
 * @define {boolean} If true, JSCompiler will use the native implementation of
 * array functions where appropriate (e.g., {@code Array#filter}) and remove the
 * unused pure JS implementation.
 */
goog.define('goog.array.ASSUME_NATIVE_FUNCTIONS', false);


/**
 * Returns the last element in an array without removing it.
 * Same as goog.array.last.
 * @param {IArrayLike<T>|string} array The array.
 * @return {T} Last item in array.
 * @template T
 */
goog.array.peek = function(array) {
  return array[array.length - 1];
};


/**
 * Returns the last element in an array without removing it.
 * Same as goog.array.peek.
 * @param {IArrayLike<T>|string} array The array.
 * @return {T} Last item in array.
 * @template T
 */
goog.array.last = goog.array.peek;

// NOTE(arv): Since most of the array functions are generic it allows you to
// pass an array-like object. Strings have a length and are considered array-
// like. However, the 'in' operator does not work on strings so we cannot just
// use the array path even if the browser supports indexing into strings. We
// therefore end up splitting the string.


/**
 * Returns the index of the first element of an array with a specified value, or
 * -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-indexof}
 *
 * @param {IArrayLike<T>|string} arr The array to be searched.
 * @param {T} obj The object for which we are searching.
 * @param {number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at index 0.
 * @return {number} The index of the first matching array element.
 * @template T
 */
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.indexOf) ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      return Array.prototype.indexOf.call(arr, obj, opt_fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ?
          0 :
          (opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) :
                               opt_fromIndex);

      if (goog.isString(arr)) {
        // Array.prototype.indexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.indexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i < arr.length; i++) {
        if (i in arr && arr[i] === obj) return i;
      }
      return -1;
    };


/**
 * Returns the index of the last element of an array with a specified value, or
 * -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-lastindexof}
 *
 * @param {!IArrayLike<T>|string} arr The array to be searched.
 * @param {T} obj The object for which we are searching.
 * @param {?number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at the end of the array.
 * @return {number} The index of the last matching array element.
 * @template T
 */
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.lastIndexOf) ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      // Firefox treats undefined and null as 0 in the fromIndex argument which
      // leads it to always return -1
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
      return Array.prototype.lastIndexOf.call(arr, obj, fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;

      if (fromIndex < 0) {
        fromIndex = Math.max(0, arr.length + fromIndex);
      }

      if (goog.isString(arr)) {
        // Array.prototype.lastIndexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.lastIndexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i >= 0; i--) {
        if (i in arr && arr[i] === obj) return i;
      }
      return -1;
    };


/**
 * Calls a function for each element in an array. Skips holes in the array.
 * See {@link http://tinyurl.com/developer-mozilla-org-array-foreach}
 *
 * @param {IArrayLike<T>|string} arr Array or array like object over
 *     which to iterate.
 * @param {?function(this: S, T, number, ?): ?} f The function to call for every
 *     element. This function takes 3 arguments (the element, the index and the
 *     array). The return value is ignored.
 * @param {S=} opt_obj The object to be used as the value of 'this' within f.
 * @template T,S
 */
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.forEach) ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      Array.prototype.forEach.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr);
        }
      }
    };


/**
 * Calls a function for each element in an array, starting from the last
 * element rather than the first.
 *
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this: S, T, number, ?): ?} f The function to call for every
 *     element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored.
 * @param {S=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @template T,S
 */
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; --i) {
    if (i in arr2) {
      f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr);
    }
  }
};


/**
 * Calls a function for each element in an array, and if the function returns
 * true adds the element to a new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-filter}
 *
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?):boolean} f The function to call for
 *     every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean. If the return value is true the element is added to the
 *     result array. If it is false the element is not included.
 * @param {S=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array<T>} a new array in which only elements that passed the test
 *     are present.
 * @template T,S
 */
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.filter) ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return Array.prototype.filter.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = [];
      var resLength = 0;
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          var val = arr2[i];  // in case f mutates arr2
          if (f.call(/** @type {?} */ (opt_obj), val, i, arr)) {
            res[resLength++] = val;
          }
        }
      }
      return res;
    };


/**
 * Calls a function for each element in an array and inserts the result into a
 * new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-map}
 *
 * @param {IArrayLike<VALUE>|string} arr Array or array like object
 *     over which to iterate.
 * @param {function(this:THIS, VALUE, number, ?): RESULT} f The function to call
 *     for every element. This function takes 3 arguments (the element,
 *     the index and the array) and should return something. The result will be
 *     inserted into a new array.
 * @param {THIS=} opt_obj The object to be used as the value of 'this' within f.
 * @return {!Array<RESULT>} a new array with the results from f.
 * @template THIS, VALUE, RESULT
 */
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.map) ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return Array.prototype.map.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = new Array(l);
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          res[i] = f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr);
        }
      }
      return res;
    };


/**
 * Passes every element of an array into a function and accumulates the result.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduce}
 *
 * For example:
 * var a = [1, 2, 3, 4];
 * goog.array.reduce(a, function(r, v, i, arr) {return r + v;}, 0);
 * returns 10
 *
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {function(this:S, R, T, number, ?) : R} f The function to call for
 *     every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {?} val The initial value to pass into the function on the first call.
 * @param {S=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {R} Result of evaluating f repeatedly across the values of the array.
 * @template T,S,R
 */
goog.array.reduce = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.reduce) ?
    function(arr, f, val, opt_obj) {
      goog.asserts.assert(arr.length != null);
      if (opt_obj) {
        f = goog.bind(f, opt_obj);
      }
      return Array.prototype.reduce.call(arr, f, val);
    } :
    function(arr, f, val, opt_obj) {
      var rval = val;
      goog.array.forEach(arr, function(val, index) {
        rval = f.call(/** @type {?} */ (opt_obj), rval, val, index, arr);
      });
      return rval;
    };


/**
 * Passes every element of an array into a function and accumulates the result,
 * starting from the last element and working towards the first.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduceright}
 *
 * For example:
 * var a = ['a', 'b', 'c'];
 * goog.array.reduceRight(a, function(r, v, i, arr) {return r + v;}, '');
 * returns 'cba'
 *
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, R, T, number, ?) : R} f The function to call for
 *     every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {?} val The initial value to pass into the function on the first call.
 * @param {S=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {R} Object returned as a result of evaluating f repeatedly across the
 *     values of the array.
 * @template T,S,R
 */
goog.array.reduceRight = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.reduceRight) ?
    function(arr, f, val, opt_obj) {
      goog.asserts.assert(arr.length != null);
      goog.asserts.assert(f != null);
      if (opt_obj) {
        f = goog.bind(f, opt_obj);
      }
      return Array.prototype.reduceRight.call(arr, f, val);
    } :
    function(arr, f, val, opt_obj) {
      var rval = val;
      goog.array.forEachRight(arr, function(val, index) {
        rval = f.call(/** @type {?} */ (opt_obj), rval, val, index, arr);
      });
      return rval;
    };


/**
 * Calls f for each element of an array. If any call returns true, some()
 * returns true (without checking the remaining elements). If all calls
 * return false, some() returns false.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-some}
 *
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call for
 *     for every element. This function takes 3 arguments (the element, the
 *     index and the array) and should return a boolean.
 * @param {S=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} true if any element passes the test.
 * @template T,S
 */
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.some) ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return Array.prototype.some.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr)) {
          return true;
        }
      }
      return false;
    };


/**
 * Call f for each element of an array. If all calls return true, every()
 * returns true. If any call returns false, every() returns false and
 * does not continue to check the remaining elements.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-every}
 *
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call for
 *     for every element. This function takes 3 arguments (the element, the
 *     index and the array) and should return a boolean.
 * @param {S=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} false if any element fails the test.
 * @template T,S
 */
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES &&
        (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.every) ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return Array.prototype.every.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && !f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr)) {
          return false;
        }
      }
      return true;
    };


/**
 * Counts the array elements that fulfill the predicate, i.e. for which the
 * callback function returns true. Skips holes in the array.
 *
 * @param {!IArrayLike<T>|string} arr Array or array like object
 *     over which to iterate.
 * @param {function(this: S, T, number, ?): boolean} f The function to call for
 *     every element. Takes 3 arguments (the element, the index and the array).
 * @param {S=} opt_obj The object to be used as the value of 'this' within f.
 * @return {number} The number of the matching elements.
 * @template T,S
 */
goog.array.count = function(arr, f, opt_obj) {
  var count = 0;
  goog.array.forEach(arr, function(element, index, arr) {
    if (f.call(/** @type {?} */ (opt_obj), element, index, arr)) {
      ++count;
    }
  }, opt_obj);
  return count;
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return that element.
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call
 *     for every element. This function takes 3 arguments (the element, the
 *     index and the array) and should return a boolean.
 * @param {S=} opt_obj An optional "this" context for the function.
 * @return {T|null} The first array element that passes the test, or null if no
 *     element is found.
 * @template T,S
 */
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return its index.
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call for
 *     every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {S=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the first array element that passes the test,
 *     or -1 if no element is found.
 * @template T,S
 */
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return that element.
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call
 *     for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {S=} opt_obj An optional "this" context for the function.
 * @return {T|null} The last array element that passes the test, or null if no
 *     element is found.
 * @template T,S
 */
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return its index.
 * @param {IArrayLike<T>|string} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call
 *     for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {S=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the last array element that passes the test,
 *     or -1 if no element is found.
 * @template T,S
 */
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; i--) {
    if (i in arr2 && f.call(/** @type {?} */ (opt_obj), arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Whether the array contains the given object.
 * @param {IArrayLike<?>|string} arr The array to test for the presence of the
 *     element.
 * @param {*} obj The object for which to test.
 * @return {boolean} true if obj is present.
 */
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0;
};


/**
 * Whether the array is empty.
 * @param {IArrayLike<?>|string} arr The array to test.
 * @return {boolean} true if empty.
 */
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};


/**
 * Clears the array.
 * @param {IArrayLike<?>} arr Array or array like object to clear.
 */
goog.array.clear = function(arr) {
  // For non real arrays we don't have the magic length so we delete the
  // indices.
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1; i >= 0; i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};


/**
 * Pushes an item into an array, if it's not already in the array.
 * @param {Array<T>} arr Array into which to insert the item.
 * @param {T} obj Value to add.
 * @template T
 */
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};


/**
 * Inserts an object at the given index of the array.
 * @param {IArrayLike<?>} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};


/**
 * Inserts at the given index of the array, all elements of another array.
 * @param {IArrayLike<?>} arr The array to modify.
 * @param {IArrayLike<?>} elementsToAdd The array of elements to add.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};


/**
 * Inserts an object into an array before a specified object.
 * @param {Array<T>} arr The array to modify.
 * @param {T} obj The object to insert.
 * @param {T=} opt_obj2 The object before which obj should be inserted. If obj2
 *     is omitted or not found, obj is inserted at the end of the array.
 * @template T
 */
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};


/**
 * Removes the first occurrence of a particular value from an array.
 * @param {IArrayLike<T>} arr Array from which to remove
 *     value.
 * @param {T} obj Object to remove.
 * @return {boolean} True if an element was removed.
 * @template T
 */
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if ((rv = i >= 0)) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};


/**
 * Removes the last occurrence of a particular value from an array.
 * @param {!IArrayLike<T>} arr Array from which to remove value.
 * @param {T} obj Object to remove.
 * @return {boolean} True if an element was removed.
 * @template T
 */
goog.array.removeLast = function(arr, obj) {
  var i = goog.array.lastIndexOf(arr, obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};


/**
 * Removes from an array the element at index i
 * @param {IArrayLike<?>} arr Array or array like object from which to
 *     remove value.
 * @param {number} i The index to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);

  // use generic form of splice
  // splice returns the removed items and if successful the length of that
  // will be 1
  return Array.prototype.splice.call(arr, i, 1).length == 1;
};


/**
 * Removes the first value that satisfies the given condition.
 * @param {IArrayLike<T>} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call
 *     for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {S=} opt_obj An optional "this" context for the function.
 * @return {boolean} True if an element was removed.
 * @template T,S
 */
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};


/**
 * Removes all values that satisfy the given condition.
 * @param {IArrayLike<T>} arr Array or array
 *     like object over which to iterate.
 * @param {?function(this:S, T, number, ?) : boolean} f The function to call
 *     for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {S=} opt_obj An optional "this" context for the function.
 * @return {number} The number of items removed
 * @template T,S
 */
goog.array.removeAllIf = function(arr, f, opt_obj) {
  var removedCount = 0;
  goog.array.forEachRight(arr, function(val, index) {
    if (f.call(/** @type {?} */ (opt_obj), val, index, arr)) {
      if (goog.array.removeAt(arr, index)) {
        removedCount++;
      }
    }
  });
  return removedCount;
};


/**
 * Returns a new array that is the result of joining the arguments.  If arrays
 * are passed then their items are added, however, if non-arrays are passed they
 * will be added to the return array as is.
 *
 * Note that ArrayLike objects will be added as is, rather than having their
 * items added.
 *
 * goog.array.concat([1, 2], [3, 4]) -> [1, 2, 3, 4]
 * goog.array.concat(0, [1, 2]) -> [0, 1, 2]
 * goog.array.concat([1, 2], null) -> [1, 2, null]
 *
 * There is bug in all current versions of IE (6, 7 and 8) where arrays created
 * in an iframe become corrupted soon (not immediately) after the iframe is
 * destroyed. This is common if loading data via goog.net.IframeIo, for example.
 * This corruption only affects the concat method which will start throwing
 * Catastrophic Errors (#-2147418113).
 *
 * See http://endoflow.com/scratch/corrupted-arrays.html for a test case.
 *
 * Internally goog.array should use this, so that all methods will continue to
 * work on these broken array objects.
 *
 * @param {...*} var_args Items to concatenate.  Arrays will have each item
 *     added, while primitives and objects will be added as is.
 * @return {!Array<?>} The new resultant array.
 */
goog.array.concat = function(var_args) {
  return Array.prototype.concat.apply([], arguments);
};


/**
 * Returns a new array that contains the contents of all the arrays passed.
 * @param {...!Array<T>} var_args
 * @return {!Array<T>}
 * @template T
 */
goog.array.join = function(var_args) {
  return Array.prototype.concat.apply([], arguments);
};


/**
 * Converts an object to an array.
 * @param {IArrayLike<T>|string} object  The object to convert to an
 *     array.
 * @return {!Array<T>} The object converted into an array. If object has a
 *     length property, every property indexed with a non-negative number
 *     less than length will be included in the result. If object does not
 *     have a length property, an empty array will be returned.
 * @template T
 */
goog.array.toArray = function(object) {
  var length = object.length;

  // If length is not a number the following it false. This case is kept for
  // backwards compatibility since there are callers that pass objects that are
  // not array like.
  if (length > 0) {
    var rv = new Array(length);
    for (var i = 0; i < length; i++) {
      rv[i] = object[i];
    }
    return rv;
  }
  return [];
};


/**
 * Does a shallow copy of an array.
 * @param {IArrayLike<T>|string} arr  Array or array-like object to
 *     clone.
 * @return {!Array<T>} Clone of the input array.
 * @template T
 */
goog.array.clone = goog.array.toArray;


/**
 * Extends an array with another array, element, or "array like" object.
 * This function operates 'in-place', it does not create a new Array.
 *
 * Example:
 * var a = [];
 * goog.array.extend(a, [0, 1]);
 * a; // [0, 1]
 * goog.array.extend(a, 2);
 * a; // [0, 1, 2]
 *
 * @param {Array<VALUE>} arr1  The array to modify.
 * @param {...(IArrayLike<VALUE>|VALUE)} var_args The elements or arrays of
 *     elements to add to arr1.
 * @template VALUE
 */
goog.array.extend = function(arr1, var_args) {
  for (var i = 1; i < arguments.length; i++) {
    var arr2 = arguments[i];
    if (goog.isArrayLike(arr2)) {
      var len1 = arr1.length || 0;
      var len2 = arr2.length || 0;
      arr1.length = len1 + len2;
      for (var j = 0; j < len2; j++) {
        arr1[len1 + j] = arr2[j];
      }
    } else {
      arr1.push(arr2);
    }
  }
};


/**
 * Adds or removes elements from an array. This is a generic version of Array
 * splice. This means that it might work on other objects similar to arrays,
 * such as the arguments object.
 *
 * @param {IArrayLike<T>} arr The array to modify.
 * @param {number|undefined} index The index at which to start changing the
 *     array. If not defined, treated as 0.
 * @param {number} howMany How many elements to remove (0 means no removal. A
 *     value below 0 is treated as zero and so is any other non number. Numbers
 *     are floored).
 * @param {...T} var_args Optional, additional elements to insert into the
 *     array.
 * @return {!Array<T>} the removed elements.
 * @template T
 */
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);

  return Array.prototype.splice.apply(arr, goog.array.slice(arguments, 1));
};


/**
 * Returns a new array from a segment of an array. This is a generic version of
 * Array slice. This means that it might work on other objects similar to
 * arrays, such as the arguments object.
 *
 * @param {IArrayLike<T>|string} arr The array from
 * which to copy a segment.
 * @param {number} start The index of the first element to copy.
 * @param {number=} opt_end The index after the last element to copy.
 * @return {!Array<T>} A new array containing the specified segment of the
 *     original array.
 * @template T
 */
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);

  // passing 1 arg to slice is not the same as passing 2 where the second is
  // null or undefined (in that case the second argument is treated as 0).
  // we could use slice on the arguments object and then use apply instead of
  // testing the length
  if (arguments.length <= 2) {
    return Array.prototype.slice.call(arr, start);
  } else {
    return Array.prototype.slice.call(arr, start, opt_end);
  }
};


/**
 * Removes all duplicates from an array (retaining only the first
 * occurrence of each array element).  This function modifies the
 * array in place and doesn't change the order of the non-duplicate items.
 *
 * For objects, duplicates are identified as having the same unique ID as
 * defined by {@link goog.getUid}.
 *
 * Alternatively you can specify a custom hash function that returns a unique
 * value for each item in the array it should consider unique.
 *
 * Runtime: N,
 * Worstcase space: 2N (no dupes)
 *
 * @param {IArrayLike<T>} arr The array from which to remove
 *     duplicates.
 * @param {Array=} opt_rv An optional array in which to return the results,
 *     instead of performing the removal inplace.  If specified, the original
 *     array will remain unchanged.
 * @param {function(T):string=} opt_hashFn An optional function to use to
 *     apply to every item in the array. This function should return a unique
 *     value for each item in the array it should consider unique.
 * @template T
 */
goog.array.removeDuplicates = function(arr, opt_rv, opt_hashFn) {
  var returnArray = opt_rv || arr;
  var defaultHashFn = function(item) {
    // Prefix each type with a single character representing the type to
    // prevent conflicting keys (e.g. true and 'true').
    return goog.isObject(item) ? 'o' + goog.getUid(item) :
                                 (typeof item).charAt(0) + item;
  };
  var hashFn = opt_hashFn || defaultHashFn;

  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = hashFn(current);
    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current;
    }
  }
  returnArray.length = cursorInsert;
};


/**
 * Searches the specified array for the specified target using the binary
 * search algorithm.  If no opt_compareFn is specified, elements are compared
 * using <code>goog.array.defaultCompare</code>, which compares the elements
 * using the built in < and > operators.  This will produce the expected
 * behavior for homogeneous arrays of String(s) and Number(s). The array
 * specified <b>must</b> be sorted in ascending order (as defined by the
 * comparison function).  If the array is not sorted, results are undefined.
 * If the array contains multiple instances of the specified target value, any
 * of these instances may be found.
 *
 * Runtime: O(log n)
 *
 * @param {IArrayLike<VALUE>} arr The array to be searched.
 * @param {TARGET} target The sought value.
 * @param {function(TARGET, VALUE): number=} opt_compareFn Optional comparison
 *     function by which the array is ordered. Should take 2 arguments to
 *     compare, and return a negative number, zero, or a positive number
 *     depending on whether the first argument is less than, equal to, or
 *     greater than the second.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @template TARGET, VALUE
 */
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(
      arr, opt_compareFn || goog.array.defaultCompare, false /* isEvaluator */,
      target);
};


/**
 * Selects an index in the specified array using the binary search algorithm.
 * The evaluator receives an element and determines whether the desired index
 * is before, at, or after it.  The evaluator must be consistent (formally,
 * goog.array.map(goog.array.map(arr, evaluator, opt_obj), goog.math.sign)
 * must be monotonically non-increasing).
 *
 * Runtime: O(log n)
 *
 * @param {IArrayLike<VALUE>} arr The array to be searched.
 * @param {function(this:THIS, VALUE, number, ?): number} evaluator
 *     Evaluator function that receives 3 arguments (the element, the index and
 *     the array). Should return a negative number, zero, or a positive number
 *     depending on whether the desired index is before, at, or after the
 *     element passed to it.
 * @param {THIS=} opt_obj The object to be used as the value of 'this'
 *     within evaluator.
 * @return {number} Index of the leftmost element matched by the evaluator, if
 *     such exists; otherwise (-(insertion point) - 1). The insertion point is
 *     the index of the first element for which the evaluator returns negative,
 *     or arr.length if no such element exists. The return value is non-negative
 *     iff a match is found.
 * @template THIS, VALUE
 */
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(
      arr, evaluator, true /* isEvaluator */, undefined /* opt_target */,
      opt_obj);
};


/**
 * Implementation of a binary search algorithm which knows how to use both
 * comparison functions and evaluators. If an evaluator is provided, will call
 * the evaluator with the given optional data object, conforming to the
 * interface defined in binarySelect. Otherwise, if a comparison function is
 * provided, will call the comparison function against the given data object.
 *
 * This implementation purposefully does not use goog.bind or goog.partial for
 * performance reasons.
 *
 * Runtime: O(log n)
 *
 * @param {IArrayLike<?>} arr The array to be searched.
 * @param {function(?, ?, ?): number | function(?, ?): number} compareFn
 *     Either an evaluator or a comparison function, as defined by binarySearch
 *     and binarySelect above.
 * @param {boolean} isEvaluator Whether the function is an evaluator or a
 *     comparison function.
 * @param {?=} opt_target If the function is a comparison function, then
 *     this is the target to binary search for.
 * @param {Object=} opt_selfObj If the function is an evaluator, this is an
 *     optional this object for the evaluator.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @private
 */
goog.array.binarySearch_ = function(
    arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;            // inclusive
  var right = arr.length;  // exclusive
  var found;
  while (left < right) {
    var middle = (left + right) >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      // NOTE(dimvar): To avoid this cast, we'd have to use function overloading
      // for the type of binarySearch_, which the type system can't express yet.
      compareResult = /** @type {function(?, ?): number} */ (compareFn)(
          opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      // We are looking for the lowest index so we can't return immediately.
      found = !compareResult;
    }
  }
  // left is the index if found, or the insertion point otherwise.
  // ~left is a shorthand for -left - 1.
  return found ? left : ~left;
};


/**
 * Sorts the specified array into ascending order.  If no opt_compareFn is
 * specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s), unlike the native sort,
 * but will give unpredictable results for heterogeneous lists of strings and
 * numbers with different numbers of digits.
 *
 * This sort is not guaranteed to be stable.
 *
 * Runtime: Same as <code>Array.prototype.sort</code>
 *
 * @param {Array<T>} arr The array to be sorted.
 * @param {?function(T,T):number=} opt_compareFn Optional comparison
 *     function by which the
 *     array is to be ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @template T
 */
goog.array.sort = function(arr, opt_compareFn) {
  // TODO(arv): Update type annotation since null is not accepted.
  arr.sort(opt_compareFn || goog.array.defaultCompare);
};


/**
 * Sorts the specified array into ascending order in a stable way.  If no
 * opt_compareFn is specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s).
 *
 * Runtime: Same as <code>Array.prototype.sort</code>, plus an additional
 * O(n) overhead of copying the array twice.
 *
 * @param {Array<T>} arr The array to be sorted.
 * @param {?function(T, T): number=} opt_compareFn Optional comparison function
 *     by which the array is to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @template T
 */
goog.array.stableSort = function(arr, opt_compareFn) {
  var compArr = new Array(arr.length);
  for (var i = 0; i < arr.length; i++) {
    compArr[i] = {index: i, value: arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  }
  goog.array.sort(compArr, stableCompareFn);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = compArr[i].value;
  }
};


/**
 * Sort the specified array into ascending order based on item keys
 * returned by the specified key function.
 * If no opt_compareFn is specified, the keys are compared in ascending order
 * using <code>goog.array.defaultCompare</code>.
 *
 * Runtime: O(S(f(n)), where S is runtime of <code>goog.array.sort</code>
 * and f(n) is runtime of the key function.
 *
 * @param {Array<T>} arr The array to be sorted.
 * @param {function(T): K} keyFn Function taking array element and returning
 *     a key used for sorting this element.
 * @param {?function(K, K): number=} opt_compareFn Optional comparison function
 *     by which the keys are to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @template T,K
 */
goog.array.sortByKey = function(arr, keyFn, opt_compareFn) {
  var keyCompareFn = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(
      arr, function(a, b) { return keyCompareFn(keyFn(a), keyFn(b)); });
};


/**
 * Sorts an array of objects by the specified object key and compare
 * function. If no compare function is provided, the key values are
 * compared in ascending order using <code>goog.array.defaultCompare</code>.
 * This won't work for keys that get renamed by the compiler. So use
 * {'foo': 1, 'bar': 2} rather than {foo: 1, bar: 2}.
 * @param {Array<Object>} arr An array of objects to sort.
 * @param {string} key The object key to sort by.
 * @param {Function=} opt_compareFn The function to use to compare key
 *     values.
 */
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  goog.array.sortByKey(arr, function(obj) { return obj[key]; }, opt_compareFn);
};


/**
 * Tells if the array is sorted.
 * @param {!IArrayLike<T>} arr The array.
 * @param {?function(T,T):number=} opt_compareFn Function to compare the
 *     array elements.
 *     Should take 2 arguments to compare, and return a negative number, zero,
 *     or a positive number depending on whether the first argument is less
 *     than, equal to, or greater than the second.
 * @param {boolean=} opt_strict If true no equal elements are allowed.
 * @return {boolean} Whether the array is sorted.
 * @template T
 */
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for (var i = 1; i < arr.length; i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if (compareResult > 0 || compareResult == 0 && opt_strict) {
      return false;
    }
  }
  return true;
};


/**
 * Compares two arrays for equality. Two arrays are considered equal if they
 * have the same length and their corresponding elements are equal according to
 * the comparison function.
 *
 * @param {IArrayLike<?>} arr1 The first array to compare.
 * @param {IArrayLike<?>} arr2 The second array to compare.
 * @param {Function=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {boolean} Whether the two arrays are equal.
 */
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) ||
      arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < l; i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};


/**
 * 3-way array compare function.
 * @param {!IArrayLike<VALUE>} arr1 The first array to
 *     compare.
 * @param {!IArrayLike<VALUE>} arr2 The second array to
 *     compare.
 * @param {function(VALUE, VALUE): number=} opt_compareFn Optional comparison
 *     function by which the array is to be ordered. Should take 2 arguments to
 *     compare, and return a negative number, zero, or a positive number
 *     depending on whether the first argument is less than, equal to, or
 *     greater than the second.
 * @return {number} Negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @template VALUE
 */
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for (var i = 0; i < l; i++) {
    var result = compare(arr1[i], arr2[i]);
    if (result != 0) {
      return result;
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length);
};


/**
 * Compares its two arguments for order, using the built in < and >
 * operators.
 * @param {VALUE} a The first object to be compared.
 * @param {VALUE} b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second,
 *     respectively.
 * @template VALUE
 */
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};


/**
 * Compares its two arguments for inverse order, using the built in < and >
 * operators.
 * @param {VALUE} a The first object to be compared.
 * @param {VALUE} b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is greater than, equal to, or less than the second,
 *     respectively.
 * @template VALUE
 */
goog.array.inverseDefaultCompare = function(a, b) {
  return -goog.array.defaultCompare(a, b);
};


/**
 * Compares its two arguments for equality, using the built in === operator.
 * @param {*} a The first object to compare.
 * @param {*} b The second object to compare.
 * @return {boolean} True if the two arguments are equal, false otherwise.
 */
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};


/**
 * Inserts a value into a sorted array. The array is not modified if the
 * value is already present.
 * @param {IArrayLike<VALUE>} array The array to modify.
 * @param {VALUE} value The object to insert.
 * @param {function(VALUE, VALUE): number=} opt_compareFn Optional comparison
 *     function by which the array is ordered. Should take 2 arguments to
 *     compare, and return a negative number, zero, or a positive number
 *     depending on whether the first argument is less than, equal to, or
 *     greater than the second.
 * @return {boolean} True if an element was inserted.
 * @template VALUE
 */
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};


/**
 * Removes a value from a sorted array.
 * @param {!IArrayLike<VALUE>} array The array to modify.
 * @param {VALUE} value The object to remove.
 * @param {function(VALUE, VALUE): number=} opt_compareFn Optional comparison
 *     function by which the array is ordered. Should take 2 arguments to
 *     compare, and return a negative number, zero, or a positive number
 *     depending on whether the first argument is less than, equal to, or
 *     greater than the second.
 * @return {boolean} True if an element was removed.
 * @template VALUE
 */
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return (index >= 0) ? goog.array.removeAt(array, index) : false;
};


/**
 * Splits an array into disjoint buckets according to a splitting function.
 * @param {IArrayLike<T>} array The array.
 * @param {function(this:S, T, number, !IArrayLike<T>):?} sorter Function to
 *     call for every element.  This takes 3 arguments (the element, the index
 *     and the array) and must return a valid object key (a string, number,
 *     etc), or undefined, if that object should not be placed in a bucket.
 * @param {S=} opt_obj The object to be used as the value of 'this' within
 *     sorter.
 * @return {!Object<!Array<T>>} An object, with keys being all of the unique
 *     return values of sorter, and values being arrays containing the items for
 *     which the splitter returned that key.
 * @template T,S
 */
goog.array.bucket = function(array, sorter, opt_obj) {
  var buckets = {};

  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    var key = sorter.call(/** @type {?} */ (opt_obj), value, i, array);
    if (goog.isDef(key)) {
      // Push the value to the right bucket, creating it if necessary.
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }

  return buckets;
};


/**
 * Creates a new object built from the provided array and the key-generation
 * function.
 * @param {IArrayLike<T>} arr Array or array like object over
 *     which to iterate whose elements will be the values in the new object.
 * @param {?function(this:S, T, number, ?) : string} keyFunc The function to
 *     call for every element. This function takes 3 arguments (the element, the
 *     index and the array) and should return a string that will be used as the
 *     key for the element in the new object. If the function returns the same
 *     key for more than one element, the value for that key is
 *     implementation-defined.
 * @param {S=} opt_obj The object to be used as the value of 'this'
 *     within keyFunc.
 * @return {!Object<T>} The new object.
 * @template T,S
 */
goog.array.toObject = function(arr, keyFunc, opt_obj) {
  var ret = {};
  goog.array.forEach(arr, function(element, index) {
    ret[keyFunc.call(/** @type {?} */ (opt_obj), element, index, arr)] =
        element;
  });
  return ret;
};


/**
 * Creates a range of numbers in an arithmetic progression.
 *
 * Range takes 1, 2, or 3 arguments:
 * <pre>
 * range(5) is the same as range(0, 5, 1) and produces [0, 1, 2, 3, 4]
 * range(2, 5) is the same as range(2, 5, 1) and produces [2, 3, 4]
 * range(-2, -5, -1) produces [-2, -3, -4]
 * range(-2, -5, 1) produces [], since stepping by 1 wouldn't ever reach -5.
 * </pre>
 *
 * @param {number} startOrEnd The starting value of the range if an end argument
 *     is provided. Otherwise, the start value is 0, and this is the end value.
 * @param {number=} opt_end The optional end value of the range.
 * @param {number=} opt_step The step size between range values. Defaults to 1
 *     if opt_step is undefined or 0.
 * @return {!Array<number>} An array of numbers for the requested range. May be
 *     an empty array if adding the step would not converge toward the end
 *     value.
 */
goog.array.range = function(startOrEnd, opt_end, opt_step) {
  var array = [];
  var start = 0;
  var end = startOrEnd;
  var step = opt_step || 1;
  if (opt_end !== undefined) {
    start = startOrEnd;
    end = opt_end;
  }

  if (step * (end - start) < 0) {
    // Sign mismatch: start + step will never reach the end value.
    return [];
  }

  if (step > 0) {
    for (var i = start; i < end; i += step) {
      array.push(i);
    }
  } else {
    for (var i = start; i > end; i += step) {
      array.push(i);
    }
  }
  return array;
};


/**
 * Returns an array consisting of the given value repeated N times.
 *
 * @param {VALUE} value The value to repeat.
 * @param {number} n The repeat count.
 * @return {!Array<VALUE>} An array with the repeated value.
 * @template VALUE
 */
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
};


/**
 * Returns an array consisting of every argument with all arrays
 * expanded in-place recursively.
 *
 * @param {...*} var_args The values to flatten.
 * @return {!Array<?>} An array containing the flattened values.
 */
goog.array.flatten = function(var_args) {
  var CHUNK_SIZE = 8192;

  var result = [];
  for (var i = 0; i < arguments.length; i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      for (var c = 0; c < element.length; c += CHUNK_SIZE) {
        var chunk = goog.array.slice(element, c, c + CHUNK_SIZE);
        var recurseResult = goog.array.flatten.apply(null, chunk);
        for (var r = 0; r < recurseResult.length; r++) {
          result.push(recurseResult[r]);
        }
      }
    } else {
      result.push(element);
    }
  }
  return result;
};


/**
 * Rotates an array in-place. After calling this method, the element at
 * index i will be the element previously at index (i - n) %
 * array.length, for all values of i between 0 and array.length - 1,
 * inclusive.
 *
 * For example, suppose list comprises [t, a, n, k, s]. After invoking
 * rotate(array, 1) (or rotate(array, -4)), array will comprise [s, t, a, n, k].
 *
 * @param {!Array<T>} array The array to rotate.
 * @param {number} n The amount to rotate.
 * @return {!Array<T>} The array.
 * @template T
 */
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);

  if (array.length) {
    n %= array.length;
    if (n > 0) {
      Array.prototype.unshift.apply(array, array.splice(-n, n));
    } else if (n < 0) {
      Array.prototype.push.apply(array, array.splice(0, -n));
    }
  }
  return array;
};


/**
 * Moves one item of an array to a new position keeping the order of the rest
 * of the items. Example use case: keeping a list of JavaScript objects
 * synchronized with the corresponding list of DOM elements after one of the
 * elements has been dragged to a new position.
 * @param {!IArrayLike<?>} arr The array to modify.
 * @param {number} fromIndex Index of the item to move between 0 and
 *     {@code arr.length - 1}.
 * @param {number} toIndex Target index between 0 and {@code arr.length - 1}.
 */
goog.array.moveItem = function(arr, fromIndex, toIndex) {
  goog.asserts.assert(fromIndex >= 0 && fromIndex < arr.length);
  goog.asserts.assert(toIndex >= 0 && toIndex < arr.length);
  // Remove 1 item at fromIndex.
  var removedItems = Array.prototype.splice.call(arr, fromIndex, 1);
  // Insert the removed item at toIndex.
  Array.prototype.splice.call(arr, toIndex, 0, removedItems[0]);
  // We don't use goog.array.insertAt and goog.array.removeAt, because they're
  // significantly slower than splice.
};


/**
 * Creates a new array for which the element at position i is an array of the
 * ith element of the provided arrays.  The returned array will only be as long
 * as the shortest array provided; additional values are ignored.  For example,
 * the result of zipping [1, 2] and [3, 4, 5] is [[1,3], [2, 4]].
 *
 * This is similar to the zip() function in Python.  See {@link
 * http://docs.python.org/library/functions.html#zip}
 *
 * @param {...!IArrayLike<?>} var_args Arrays to be combined.
 * @return {!Array<!Array<?>>} A new array of arrays created from
 *     provided arrays.
 */
goog.array.zip = function(var_args) {
  if (!arguments.length) {
    return [];
  }
  var result = [];
  var minLen = arguments[0].length;
  for (var i = 1; i < arguments.length; i++) {
    if (arguments[i].length < minLen) {
      minLen = arguments[i].length;
    }
  }
  for (var i = 0; i < minLen; i++) {
    var value = [];
    for (var j = 0; j < arguments.length; j++) {
      value.push(arguments[j][i]);
    }
    result.push(value);
  }
  return result;
};


/**
 * Shuffles the values in the specified array using the Fisher-Yates in-place
 * shuffle (also known as the Knuth Shuffle). By default, calls Math.random()
 * and so resets the state of that random number generator. Similarly, may reset
 * the state of the any other specified random number generator.
 *
 * Runtime: O(n)
 *
 * @param {!Array<?>} arr The array to be shuffled.
 * @param {function():number=} opt_randFn Optional random function to use for
 *     shuffling.
 *     Takes no arguments, and returns a random number on the interval [0, 1).
 *     Defaults to Math.random() using JavaScript's built-in Math library.
 */
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;

  for (var i = arr.length - 1; i > 0; i--) {
    // Choose a random array index in [0, i] (inclusive with i).
    var j = Math.floor(randFn() * (i + 1));

    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};


/**
 * Returns a new array of elements from arr, based on the indexes of elements
 * provided by index_arr. For example, the result of index copying
 * ['a', 'b', 'c'] with index_arr [1,0,0,2] is ['b', 'a', 'a', 'c'].
 *
 * @param {!IArrayLike<T>} arr The array to get a indexed copy from.
 * @param {!IArrayLike<number>} index_arr An array of indexes to get from arr.
 * @return {!Array<T>} A new array of elements from arr in index_arr order.
 * @template T
 */
goog.array.copyByIndex = function(arr, index_arr) {
  var result = [];
  goog.array.forEach(index_arr, function(index) { result.push(arr[index]); });
  return result;
};


/**
 * Maps each element of the input array into zero or more elements of the output
 * array.
 *
 * @param {!IArrayLike<VALUE>|string} arr Array or array like object
 *     over which to iterate.
 * @param {function(this:THIS, VALUE, number, ?): !Array<RESULT>} f The function
 *     to call for every element. This function takes 3 arguments (the element,
 *     the index and the array) and should return an array. The result will be
 *     used to extend a new array.
 * @param {THIS=} opt_obj The object to be used as the value of 'this' within f.
 * @return {!Array<RESULT>} a new array with the concatenation of all arrays
 *     returned from f.
 * @template THIS, VALUE, RESULT
 */
goog.array.concatMap = function(arr, f, opt_obj) {
  return goog.array.concat.apply([], goog.array.map(arr, f, opt_obj));
};

//javascript/closure/uri/utils.js
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Simple utilities for dealing with URI strings.
 *
 * This is intended to be a lightweight alternative to constructing goog.Uri
 * objects.  Whereas goog.Uri adds several kilobytes to the binary regardless
 * of how much of its functionality you use, this is designed to be a set of
 * mostly-independent utilities so that the compiler includes only what is
 * necessary for the task.  Estimated savings of porting is 5k pre-gzip and
 * 1.5k post-gzip.  To ensure the savings remain, future developers should
 * avoid adding new functionality to existing functions, but instead create
 * new ones and factor out shared code.
 *
 * Many of these utilities have limited functionality, tailored to common
 * cases.  The query parameter utilities assume that the parameter keys are
 * already encoded, since most keys are compile-time alphanumeric strings.  The
 * query parameter mutation utilities also do not tolerate fragment identifiers.
 *
 * By design, these functions can be slower than goog.Uri equivalents.
 * Repeated calls to some of functions may be quadratic in behavior for IE,
 * although the effect is somewhat limited given the 2kb limit.
 *
 * One advantage of the limited functionality here is that this approach is
 * less sensitive to differences in URI encodings than goog.Uri, since these
 * functions operate on strings directly, rather than decoding them and
 * then re-encoding.
 *
 * Uses features of RFC 3986 for parsing/formatting URIs:
 *   http://www.ietf.org/rfc/rfc3986.txt
 *
 * @author gboyer@google.com (Garrett Boyer) - The "lightened" design.
 * @author msamuel@google.com (Mike Samuel) - Domain knowledge and regexes.
 */

goog.provide('goog.uri.utils');
goog.provide('goog.uri.utils.ComponentIndex');
goog.provide('goog.uri.utils.QueryArray');
goog.provide('goog.uri.utils.QueryValue');
goog.provide('goog.uri.utils.StandardQueryParam');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.string');


/**
 * Character codes inlined to avoid object allocations due to charCode.
 * @enum {number}
 * @private
 */
goog.uri.utils.CharCode_ = {
  AMPERSAND: 38,
  EQUAL: 61,
  HASH: 35,
  QUESTION: 63
};


/**
 * Builds a URI string from already-encoded parts.
 *
 * No encoding is performed.  Any component may be omitted as either null or
 * undefined.
 *
 * @param {?string=} opt_scheme The scheme such as 'http'.
 * @param {?string=} opt_userInfo The user name before the '@'.
 * @param {?string=} opt_domain The domain such as 'www.google.com', already
 *     URI-encoded.
 * @param {(string|number|null)=} opt_port The port number.
 * @param {?string=} opt_path The path, already URI-encoded.  If it is not
 *     empty, it must begin with a slash.
 * @param {?string=} opt_queryData The URI-encoded query data.
 * @param {?string=} opt_fragment The URI-encoded fragment identifier.
 * @return {string} The fully combined URI.
 */
goog.uri.utils.buildFromEncodedParts = function(
    opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData,
    opt_fragment) {
  var out = '';

  if (opt_scheme) {
    out += opt_scheme + ':';
  }

  if (opt_domain) {
    out += '//';

    if (opt_userInfo) {
      out += opt_userInfo + '@';
    }

    out += opt_domain;

    if (opt_port) {
      out += ':' + opt_port;
    }
  }

  if (opt_path) {
    out += opt_path;
  }

  if (opt_queryData) {
    out += '?' + opt_queryData;
  }

  if (opt_fragment) {
    out += '#' + opt_fragment;
  }

  return out;
};


/**
 * A regular expression for breaking a URI into its component parts.
 *
 * {@link http://www.ietf.org/rfc/rfc3986.txt} says in Appendix B
 * As the "first-match-wins" algorithm is identical to the "greedy"
 * disambiguation method used by POSIX regular expressions, it is natural and
 * commonplace to use a regular expression for parsing the potential five
 * components of a URI reference.
 *
 * The following line is the regular expression for breaking-down a
 * well-formed URI reference into its components.
 *
 * <pre>
 * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
 *  12            3  4          5       6  7        8 9
 * </pre>
 *
 * The numbers in the second line above are only to assist readability; they
 * indicate the reference points for each subexpression (i.e., each paired
 * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
 * For example, matching the above expression to
 * <pre>
 *     http://www.ics.uci.edu/pub/ietf/uri/#Related
 * </pre>
 * results in the following subexpression matches:
 * <pre>
 *    $1 = http:
 *    $2 = http
 *    $3 = //www.ics.uci.edu
 *    $4 = www.ics.uci.edu
 *    $5 = /pub/ietf/uri/
 *    $6 = <undefined>
 *    $7 = <undefined>
 *    $8 = #Related
 *    $9 = Related
 * </pre>
 * where <undefined> indicates that the component is not present, as is the
 * case for the query component in the above example. Therefore, we can
 * determine the value of the five components as
 * <pre>
 *    scheme    = $2
 *    authority = $4
 *    path      = $5
 *    query     = $7
 *    fragment  = $9
 * </pre>
 *
 * The regular expression has been modified slightly to expose the
 * userInfo, domain, and port separately from the authority.
 * The modified version yields
 * <pre>
 *    $1 = http              scheme
 *    $2 = <undefined>       userInfo -\
 *    $3 = www.ics.uci.edu   domain     | authority
 *    $4 = <undefined>       port     -/
 *    $5 = /pub/ietf/uri/    path
 *    $6 = <undefined>       query without ?
 *    $7 = Related           fragment without #
 * </pre>
 * @type {!RegExp}
 * @private
 */
goog.uri.utils.splitRe_ = new RegExp(
    '^' +
    '(?:' +
    '([^:/?#.]+)' +  // scheme - ignore special characters
                     // used by other URL parts such as :,
                     // ?, /, #, and .
    ':)?' +
    '(?://' +
    '(?:([^/?#]*)@)?' +  // userInfo
    '([^/#?]*?)' +       // domain
    '(?::([0-9]+))?' +   // port
    '(?=[/#?]|$)' +      // authority-terminating character
    ')?' +
    '([^?#]+)?' +          // path
    '(?:\\?([^#]*))?' +    // query
    '(?:#([\\s\\S]*))?' +  // fragment
    '$');


/**
 * The index of each URI component in the return value of goog.uri.utils.split.
 * @enum {number}
 */
goog.uri.utils.ComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
};


/**
 * Splits a URI into its component parts.
 *
 * Each component can be accessed via the component indices; for example:
 * <pre>
 * goog.uri.utils.split(someStr)[goog.uri.utils.ComponentIndex.QUERY_DATA];
 * </pre>
 *
 * @param {string} uri The URI string to examine.
 * @return {!Array<string|undefined>} Each component still URI-encoded.
 *     Each component that is present will contain the encoded value, whereas
 *     components that are not present will be undefined or empty, depending
 *     on the browser's regular expression implementation.  Never null, since
 *     arbitrary strings may still look like path names.
 */
goog.uri.utils.split = function(uri) {
  // See @return comment -- never null.
  return /** @type {!Array<string|undefined>} */ (
      uri.match(goog.uri.utils.splitRe_));
};


/**
 * @param {?string} uri A possibly null string.
 * @param {boolean=} opt_preserveReserved If true, percent-encoding of RFC-3986
 *     reserved characters will not be removed.
 * @return {?string} The string URI-decoded, or null if uri is null.
 * @private
 */
goog.uri.utils.decodeIfPossible_ = function(uri, opt_preserveReserved) {
  if (!uri) {
    return uri;
  }

  return opt_preserveReserved ? decodeURI(uri) : decodeURIComponent(uri);
};


/**
 * Gets a URI component by index.
 *
 * It is preferred to use the getPathEncoded() variety of functions ahead,
 * since they are more readable.
 *
 * @param {goog.uri.utils.ComponentIndex} componentIndex The component index.
 * @param {string} uri The URI to examine.
 * @return {?string} The still-encoded component, or null if the component
 *     is not present.
 * @private
 */
goog.uri.utils.getComponentByIndex_ = function(componentIndex, uri) {
  // Convert undefined, null, and empty string into null.
  return goog.uri.utils.split(uri)[componentIndex] || null;
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The protocol or scheme, or null if none.  Does not
 *     include trailing colons or slashes.
 */
goog.uri.utils.getScheme = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.SCHEME, uri);
};


/**
 * Gets the effective scheme for the URL.  If the URL is relative then the
 * scheme is derived from the page's location.
 * @param {string} uri The URI to examine.
 * @return {string} The protocol or scheme, always lower case.
 */
goog.uri.utils.getEffectiveScheme = function(uri) {
  var scheme = goog.uri.utils.getScheme(uri);
  if (!scheme && goog.global.self && goog.global.self.location) {
    var protocol = goog.global.self.location.protocol;
    scheme = protocol.substr(0, protocol.length - 1);
  }
  // NOTE: When called from a web worker in Firefox 3.5, location maybe null.
  // All other browsers with web workers support self.location from the worker.
  return scheme ? scheme.toLowerCase() : '';
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The user name still encoded, or null if none.
 */
goog.uri.utils.getUserInfoEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.USER_INFO, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded user info, or null if none.
 */
goog.uri.utils.getUserInfo = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getUserInfoEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The domain name still encoded, or null if none.
 */
goog.uri.utils.getDomainEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.DOMAIN, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded domain, or null if none.
 */
goog.uri.utils.getDomain = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getDomainEncoded(uri), true /* opt_preserveReserved */);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?number} The port number, or null if none.
 */
goog.uri.utils.getPort = function(uri) {
  // Coerce to a number.  If the result of getComponentByIndex_ is null or
  // non-numeric, the number coersion yields NaN.  This will then return
  // null for all non-numeric cases (though also zero, which isn't a relevant
  // port number).
  return Number(
             goog.uri.utils.getComponentByIndex_(
                 goog.uri.utils.ComponentIndex.PORT, uri)) ||
      null;
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The path still encoded, or null if none. Includes the
 *     leading slash, if any.
 */
goog.uri.utils.getPathEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.PATH, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded path, or null if none.  Includes the leading
 *     slash, if any.
 */
goog.uri.utils.getPath = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getPathEncoded(uri), true /* opt_preserveReserved */);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The query data still encoded, or null if none.  Does not
 *     include the question mark itself.
 */
goog.uri.utils.getQueryData = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.QUERY_DATA, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The fragment identifier, or null if none.  Does not
 *     include the hash mark itself.
 */
goog.uri.utils.getFragmentEncoded = function(uri) {
  // The hash mark may not appear in any other part of the URL.
  var hashIndex = uri.indexOf('#');
  return hashIndex < 0 ? null : uri.substr(hashIndex + 1);
};


/**
 * @param {string} uri The URI to examine.
 * @param {?string} fragment The encoded fragment identifier, or null if none.
 *     Does not include the hash mark itself.
 * @return {string} The URI with the fragment set.
 */
goog.uri.utils.setFragmentEncoded = function(uri, fragment) {
  return goog.uri.utils.removeFragment(uri) + (fragment ? '#' + fragment : '');
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded fragment identifier, or null if none.  Does
 *     not include the hash mark.
 */
goog.uri.utils.getFragment = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getFragmentEncoded(uri));
};


/**
 * Extracts everything up to the port of the URI.
 * @param {string} uri The URI string.
 * @return {string} Everything up to and including the port.
 */
goog.uri.utils.getHost = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(
      pieces[goog.uri.utils.ComponentIndex.SCHEME],
      pieces[goog.uri.utils.ComponentIndex.USER_INFO],
      pieces[goog.uri.utils.ComponentIndex.DOMAIN],
      pieces[goog.uri.utils.ComponentIndex.PORT]);
};


/**
 * Returns the origin for a given URL.
 * @param {string} uri The URI string.
 * @return {string} Everything up to and including the port.
 */
goog.uri.utils.getOrigin = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(
      pieces[goog.uri.utils.ComponentIndex.SCHEME], null /* opt_userInfo */,
      pieces[goog.uri.utils.ComponentIndex.DOMAIN],
      pieces[goog.uri.utils.ComponentIndex.PORT]);
};


/**
 * Extracts the path of the URL and everything after.
 * @param {string} uri The URI string.
 * @return {string} The URI, starting at the path and including the query
 *     parameters and fragment identifier.
 */
goog.uri.utils.getPathAndAfter = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(
      null, null, null, null, pieces[goog.uri.utils.ComponentIndex.PATH],
      pieces[goog.uri.utils.ComponentIndex.QUERY_DATA],
      pieces[goog.uri.utils.ComponentIndex.FRAGMENT]);
};


/**
 * Gets the URI with the fragment identifier removed.
 * @param {string} uri The URI to examine.
 * @return {string} Everything preceding the hash mark.
 */
goog.uri.utils.removeFragment = function(uri) {
  // The hash mark may not appear in any other part of the URL.
  var hashIndex = uri.indexOf('#');
  return hashIndex < 0 ? uri : uri.substr(0, hashIndex);
};


/**
 * Ensures that two URI's have the exact same domain, scheme, and port.
 *
 * Unlike the version in goog.Uri, this checks protocol, and therefore is
 * suitable for checking against the browser's same-origin policy.
 *
 * @param {string} uri1 The first URI.
 * @param {string} uri2 The second URI.
 * @return {boolean} Whether they have the same scheme, domain and port.
 */
goog.uri.utils.haveSameDomain = function(uri1, uri2) {
  var pieces1 = goog.uri.utils.split(uri1);
  var pieces2 = goog.uri.utils.split(uri2);
  return pieces1[goog.uri.utils.ComponentIndex.DOMAIN] ==
      pieces2[goog.uri.utils.ComponentIndex.DOMAIN] &&
      pieces1[goog.uri.utils.ComponentIndex.SCHEME] ==
      pieces2[goog.uri.utils.ComponentIndex.SCHEME] &&
      pieces1[goog.uri.utils.ComponentIndex.PORT] ==
      pieces2[goog.uri.utils.ComponentIndex.PORT];
};


/**
 * Asserts that there are no fragment or query identifiers, only in uncompiled
 * mode.
 * @param {string} uri The URI to examine.
 * @private
 */
goog.uri.utils.assertNoFragmentsOrQueries_ = function(uri) {
  goog.asserts.assert(
      uri.indexOf('#') < 0 && uri.indexOf('?') < 0,
      'goog.uri.utils: Fragment or query identifiers are not supported: [%s]',
      uri);
};


/**
 * Supported query parameter values by the parameter serializing utilities.
 *
 * If a value is null or undefined, the key-value pair is skipped, as an easy
 * way to omit parameters conditionally.  Non-array parameters are converted
 * to a string and URI encoded.  Array values are expanded into multiple
 * &key=value pairs, with each element stringized and URI-encoded.
 *
 * @typedef {*}
 */
goog.uri.utils.QueryValue;


/**
 * An array representing a set of query parameters with alternating keys
 * and values.
 *
 * Keys are assumed to be URI encoded already and live at even indices.  See
 * goog.uri.utils.QueryValue for details on how parameter values are encoded.
 *
 * Example:
 * <pre>
 * var data = [
 *   // Simple param: ?name=BobBarker
 *   'name', 'BobBarker',
 *   // Conditional param -- may be omitted entirely.
 *   'specialDietaryNeeds', hasDietaryNeeds() ? getDietaryNeeds() : null,
 *   // Multi-valued param: &house=LosAngeles&house=NewYork&house=null
 *   'house', ['LosAngeles', 'NewYork', null]
 * ];
 * </pre>
 *
 * @typedef {!Array<string|goog.uri.utils.QueryValue>}
 */
goog.uri.utils.QueryArray;


/**
 * Parses encoded query parameters and calls callback function for every
 * parameter found in the string.
 *
 * Missing value of parameter (e.g. “…&key&…”) is treated as if the value was an
 * empty string.  Keys may be empty strings (e.g. “…&=value&…”) which also means
 * that “…&=&…” and “…&&…” will result in an empty key and value.
 *
 * @param {string} encodedQuery Encoded query string excluding question mark at
 *     the beginning.
 * @param {function(string, string)} callback Function called for every
 *     parameter found in query string.  The first argument (name) will not be
 *     urldecoded (so the function is consistent with buildQueryData), but the
 *     second will.  If the parameter has no value (i.e. “=” was not present)
 *     the second argument (value) will be an empty string.
 */
goog.uri.utils.parseQueryData = function(encodedQuery, callback) {
  if (!encodedQuery) {
    return;
  }
  var pairs = encodedQuery.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var indexOfEquals = pairs[i].indexOf('=');
    var name = null;
    var value = null;
    if (indexOfEquals >= 0) {
      name = pairs[i].substring(0, indexOfEquals);
      value = pairs[i].substring(indexOfEquals + 1);
    } else {
      name = pairs[i];
    }
    callback(name, value ? goog.string.urlDecode(value) : '');
  }
};


/**
 * Split the URI into 3 parts where the [1] is the queryData without a leading
 * '?'. For example, the URI http://foo.com/bar?a=b#abc returns
 * ['http://foo.com/bar','a=b','#abc'].
 * @param {string} uri The URI to parse.
 * @return {!Array<string>} An array representation of uri of length 3 where the
 *     middle value is the queryData without a leading '?'.
 * @private
 */
goog.uri.utils.splitQueryData_ = function(uri) {
  // Find the query data and and hash.
  var hashIndex = uri.indexOf('#');
  if (hashIndex < 0) {
    hashIndex = uri.length;
  }
  var questionIndex = uri.indexOf('?');
  var queryData;
  if (questionIndex < 0 || questionIndex > hashIndex) {
    questionIndex = hashIndex;
    queryData = '';
  } else {
    queryData = uri.substring(questionIndex + 1, hashIndex);
  }
  return [uri.substr(0, questionIndex), queryData, uri.substr(hashIndex)];
};


/**
 * Join an array created by splitQueryData_ back into a URI.
 * @param {!Array<string>} parts A URI in the form generated by splitQueryData_.
 * @return {string} The joined URI.
 * @private
 */
goog.uri.utils.joinQueryData_ = function(parts) {
  return parts[0] + (parts[1] ? '?' + parts[1] : '') + parts[2];
};


/**
 * @param {string} queryData
 * @param {string} newData
 * @return {string}
 * @private
 */
goog.uri.utils.appendQueryData_ = function(queryData, newData) {
  if (!newData) {
    return queryData;
  }
  return queryData ? queryData + '&' + newData : newData;
};


/**
 * @param {string} uri
 * @param {string} queryData
 * @return {string}
 * @private
 */
goog.uri.utils.appendQueryDataToUri_ = function(uri, queryData) {
  if (!queryData) {
    return uri;
  }
  var parts = goog.uri.utils.splitQueryData_(uri);
  parts[1] = goog.uri.utils.appendQueryData_(parts[1], queryData);
  return goog.uri.utils.joinQueryData_(parts);
};


/**
 * Appends key=value pairs to an array, supporting multi-valued objects.
 * @param {*} key The key prefix.
 * @param {goog.uri.utils.QueryValue} value The value to serialize.
 * @param {!Array<string>} pairs The array to which the 'key=value' strings
 *     should be appended.
 * @private
 */
goog.uri.utils.appendKeyValuePairs_ = function(key, value, pairs) {
  goog.asserts.assertString(key);
  if (goog.isArray(value)) {
    // Convince the compiler it's an array.
    goog.asserts.assertArray(value);
    for (var j = 0; j < value.length; j++) {
      // Convert to string explicitly, to short circuit the null and array
      // logic in this function -- this ensures that null and undefined get
      // written as literal 'null' and 'undefined', and arrays don't get
      // expanded out but instead encoded in the default way.
      goog.uri.utils.appendKeyValuePairs_(key, String(value[j]), pairs);
    }
  } else if (value != null) {
    // Skip a top-level null or undefined entirely.
    pairs.push(
        key +
        // Check for empty string. Zero gets encoded into the url as literal
        // strings.  For empty string, skip the equal sign, to be consistent
        // with UriBuilder.java.
        (value === '' ? '' : '=' + goog.string.urlEncode(value)));
  }
};


/**
 * Builds a query data string from a sequence of alternating keys and values.
 * Currently generates "&key&" for empty args.
 *
 * @param {!IArrayLike<string|goog.uri.utils.QueryValue>} keysAndValues
 *     Alternating keys and values. See the QueryArray typedef.
 * @param {number=} opt_startIndex A start offset into the arary, defaults to 0.
 * @return {string} The encoded query string, in the form 'a=1&b=2'.
 */
goog.uri.utils.buildQueryData = function(keysAndValues, opt_startIndex) {
  goog.asserts.assert(
      Math.max(keysAndValues.length - (opt_startIndex || 0), 0) % 2 == 0,
      'goog.uri.utils: Key/value lists must be even in length.');

  var params = [];
  for (var i = opt_startIndex || 0; i < keysAndValues.length; i += 2) {
    var key = /** @type {string} */ (keysAndValues[i]);
    goog.uri.utils.appendKeyValuePairs_(key, keysAndValues[i + 1], params);
  }
  return params.join('&');
};


/**
 * Builds a query data string from a map.
 * Currently generates "&key&" for empty args.
 *
 * @param {!Object<string, goog.uri.utils.QueryValue>} map An object where keys
 *     are URI-encoded parameter keys, and the values are arbitrary types
 *     or arrays. Keys with a null value are dropped.
 * @return {string} The encoded query string, in the form 'a=1&b=2'.
 */
goog.uri.utils.buildQueryDataFromMap = function(map) {
  var params = [];
  for (var key in map) {
    goog.uri.utils.appendKeyValuePairs_(key, map[key], params);
  }
  return params.join('&');
};


/**
 * Appends URI parameters to an existing URI.
 *
 * The variable arguments may contain alternating keys and values.  Keys are
 * assumed to be already URI encoded.  The values should not be URI-encoded,
 * and will instead be encoded by this function.
 * <pre>
 * appendParams('http://www.foo.com?existing=true',
 *     'key1', 'value1',
 *     'key2', 'value?willBeEncoded',
 *     'key3', ['valueA', 'valueB', 'valueC'],
 *     'key4', null);
 * result: 'http://www.foo.com?existing=true&' +
 *     'key1=value1&' +
 *     'key2=value%3FwillBeEncoded&' +
 *     'key3=valueA&key3=valueB&key3=valueC'
 * </pre>
 *
 * A single call to this function will not exhibit quadratic behavior in IE,
 * whereas multiple repeated calls may, although the effect is limited by
 * fact that URL's generally can't exceed 2kb.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {...(goog.uri.utils.QueryArray|goog.uri.utils.QueryValue)}
 * var_args
 *     An array or argument list conforming to goog.uri.utils.QueryArray.
 * @return {string} The URI with all query parameters added.
 */
goog.uri.utils.appendParams = function(uri, var_args) {
  var queryData = arguments.length == 2 ?
      goog.uri.utils.buildQueryData(arguments[1], 0) :
      goog.uri.utils.buildQueryData(arguments, 1);
  return goog.uri.utils.appendQueryDataToUri_(uri, queryData);
};


/**
 * Appends query parameters from a map.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {!Object<goog.uri.utils.QueryValue>} map An object where keys are
 *     URI-encoded parameter keys, and the values are arbitrary types or arrays.
 *     Keys with a null value are dropped.
 * @return {string} The new parameters.
 */
goog.uri.utils.appendParamsFromMap = function(uri, map) {
  var queryData = goog.uri.utils.buildQueryDataFromMap(map);
  return goog.uri.utils.appendQueryDataToUri_(uri, queryData);
};


/**
 * Appends a single URI parameter.
 *
 * Repeated calls to this can exhibit quadratic behavior in IE6 due to the
 * way string append works, though it should be limited given the 2kb limit.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {string} key The key, which must already be URI encoded.
 * @param {*=} opt_value The value, which will be stringized and encoded
 *     (assumed not already to be encoded).  If omitted, undefined, or null, the
 *     key will be added as a valueless parameter.
 * @return {string} The URI with the query parameter added.
 */
goog.uri.utils.appendParam = function(uri, key, opt_value) {
  var value = goog.isDefAndNotNull(opt_value) ?
      '=' + goog.string.urlEncode(opt_value) :
      '';
  return goog.uri.utils.appendQueryDataToUri_(uri, key + value);
};


/**
 * Finds the next instance of a query parameter with the specified name.
 *
 * Does not instantiate any objects.
 *
 * @param {string} uri The URI to search.  May contain a fragment identifier
 *     if opt_hashIndex is specified.
 * @param {number} startIndex The index to begin searching for the key at.  A
 *     match may be found even if this is one character after the ampersand.
 * @param {string} keyEncoded The URI-encoded key.
 * @param {number} hashOrEndIndex Index to stop looking at.  If a hash
 *     mark is present, it should be its index, otherwise it should be the
 *     length of the string.
 * @return {number} The position of the first character in the key's name,
 *     immediately after either a question mark or a dot.
 * @private
 */
goog.uri.utils.findParam_ = function(
    uri, startIndex, keyEncoded, hashOrEndIndex) {
  var index = startIndex;
  var keyLength = keyEncoded.length;

  // Search for the key itself and post-filter for surronuding punctuation,
  // rather than expensively building a regexp.
  while ((index = uri.indexOf(keyEncoded, index)) >= 0 &&
         index < hashOrEndIndex) {
    var precedingChar = uri.charCodeAt(index - 1);
    // Ensure that the preceding character is '&' or '?'.
    if (precedingChar == goog.uri.utils.CharCode_.AMPERSAND ||
        precedingChar == goog.uri.utils.CharCode_.QUESTION) {
      // Ensure the following character is '&', '=', '#', or NaN
      // (end of string).
      var followingChar = uri.charCodeAt(index + keyLength);
      if (!followingChar || followingChar == goog.uri.utils.CharCode_.EQUAL ||
          followingChar == goog.uri.utils.CharCode_.AMPERSAND ||
          followingChar == goog.uri.utils.CharCode_.HASH) {
        return index;
      }
    }
    index += keyLength + 1;
  }

  return -1;
};


/**
 * Regular expression for finding a hash mark or end of string.
 * @type {RegExp}
 * @private
 */
goog.uri.utils.hashOrEndRe_ = /#|$/;


/**
 * Determines if the URI contains a specific key.
 *
 * Performs no object instantiations.
 *
 * @param {string} uri The URI to process.  May contain a fragment
 *     identifier.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {boolean} Whether the key is present.
 */
goog.uri.utils.hasParam = function(uri, keyEncoded) {
  return goog.uri.utils.findParam_(
             uri, 0, keyEncoded, uri.search(goog.uri.utils.hashOrEndRe_)) >= 0;
};


/**
 * Gets the first value of a query parameter.
 * @param {string} uri The URI to process.  May contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {?string} The first value of the parameter (URI-decoded), or null
 *     if the parameter is not found.
 */
goog.uri.utils.getParamValue = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var foundIndex =
      goog.uri.utils.findParam_(uri, 0, keyEncoded, hashOrEndIndex);

  if (foundIndex < 0) {
    return null;
  } else {
    var endPosition = uri.indexOf('&', foundIndex);
    if (endPosition < 0 || endPosition > hashOrEndIndex) {
      endPosition = hashOrEndIndex;
    }
    // Progress forth to the end of the "key=" or "key&" substring.
    foundIndex += keyEncoded.length + 1;
    // Use substr, because it (unlike substring) will return empty string
    // if foundIndex > endPosition.
    return goog.string.urlDecode(
        uri.substr(foundIndex, endPosition - foundIndex));
  }
};


/**
 * Gets all values of a query parameter.
 * @param {string} uri The URI to process.  May contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {!Array<string>} All URI-decoded values with the given key.
 *     If the key is not found, this will have length 0, but never be null.
 */
goog.uri.utils.getParamValues = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var position = 0;
  var foundIndex;
  var result = [];

  while ((foundIndex = goog.uri.utils.findParam_(
              uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
    // Find where this parameter ends, either the '&' or the end of the
    // query parameters.
    position = uri.indexOf('&', foundIndex);
    if (position < 0 || position > hashOrEndIndex) {
      position = hashOrEndIndex;
    }

    // Progress forth to the end of the "key=" or "key&" substring.
    foundIndex += keyEncoded.length + 1;
    // Use substr, because it (unlike substring) will return empty string
    // if foundIndex > position.
    result.push(
        goog.string.urlDecode(uri.substr(foundIndex, position - foundIndex)));
  }

  return result;
};


/**
 * Regexp to find trailing question marks and ampersands.
 * @type {RegExp}
 * @private
 */
goog.uri.utils.trailingQueryPunctuationRe_ = /[?&]($|#)/;


/**
 * Removes all instances of a query parameter.
 * @param {string} uri The URI to process.  Must not contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.
 * @return {string} The URI with all instances of the parameter removed.
 */
goog.uri.utils.removeParam = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var position = 0;
  var foundIndex;
  var buffer = [];

  // Look for a query parameter.
  while ((foundIndex = goog.uri.utils.findParam_(
              uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
    // Get the portion of the query string up to, but not including, the ?
    // or & starting the parameter.
    buffer.push(uri.substring(position, foundIndex));
    // Progress to immediately after the '&'.  If not found, go to the end.
    // Avoid including the hash mark.
    position = Math.min(
        (uri.indexOf('&', foundIndex) + 1) || hashOrEndIndex, hashOrEndIndex);
  }

  // Append everything that is remaining.
  buffer.push(uri.substr(position));

  // Join the buffer, and remove trailing punctuation that remains.
  return buffer.join('').replace(
      goog.uri.utils.trailingQueryPunctuationRe_, '$1');
};


/**
 * Replaces all existing definitions of a parameter with a single definition.
 *
 * Repeated calls to this can exhibit quadratic behavior due to the need to
 * find existing instances and reconstruct the string, though it should be
 * limited given the 2kb limit.  Consider using appendParams or setParamsFromMap
 * to update multiple parameters in bulk.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {string} keyEncoded The key, which must already be URI encoded.
 * @param {*} value The value, which will be stringized and encoded (assumed
 *     not already to be encoded).
 * @return {string} The URI with the query parameter added.
 */
goog.uri.utils.setParam = function(uri, keyEncoded, value) {
  return goog.uri.utils.appendParam(
      goog.uri.utils.removeParam(uri, keyEncoded), keyEncoded, value);
};


/**
 * Effeciently set or remove multiple query parameters in a URI. Order of
 * unchanged parameters will not be modified, all updated parameters will be
 * appended to the end of the query. Params with values of null or undefined are
 * removed.
 *
 * @param {string} uri The URI to process.
 * @param {!Object<string, goog.uri.utils.QueryValue>} params A list of
 *     parameters to update. If null or undefined, the param will be removed.
 * @return {string} An updated URI where the query data has been updated with
 *     the params.
 */
goog.uri.utils.setParamsFromMap = function(uri, params) {
  var parts = goog.uri.utils.splitQueryData_(uri);
  var queryData = parts[1];
  var buffer = [];
  if (queryData) {
    goog.array.forEach(queryData.split('&'), function(pair) {
      var indexOfEquals = pair.indexOf('=');
      var name = indexOfEquals >= 0 ? pair.substr(0, indexOfEquals) : pair;
      if (!params.hasOwnProperty(name)) {
        buffer.push(pair);
      }
    });
  }
  parts[1] = goog.uri.utils.appendQueryData_(
      buffer.join('&'), goog.uri.utils.buildQueryDataFromMap(params));
  return goog.uri.utils.joinQueryData_(parts);
};


/**
 * Generates a URI path using a given URI and a path with checks to
 * prevent consecutive "//". The baseUri passed in must not contain
 * query or fragment identifiers. The path to append may not contain query or
 * fragment identifiers.
 *
 * @param {string} baseUri URI to use as the base.
 * @param {string} path Path to append.
 * @return {string} Updated URI.
 */
goog.uri.utils.appendPath = function(baseUri, path) {
  goog.uri.utils.assertNoFragmentsOrQueries_(baseUri);

  // Remove any trailing '/'
  if (goog.string.endsWith(baseUri, '/')) {
    baseUri = baseUri.substr(0, baseUri.length - 1);
  }
  // Remove any leading '/'
  if (goog.string.startsWith(path, '/')) {
    path = path.substr(1);
  }
  return goog.string.buildString(baseUri, '/', path);
};


/**
 * Replaces the path.
 * @param {string} uri URI to use as the base.
 * @param {string} path New path.
 * @return {string} Updated URI.
 */
goog.uri.utils.setPath = function(uri, path) {
  // Add any missing '/'.
  if (!goog.string.startsWith(path, '/')) {
    path = '/' + path;
  }
  var parts = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(
      parts[goog.uri.utils.ComponentIndex.SCHEME],
      parts[goog.uri.utils.ComponentIndex.USER_INFO],
      parts[goog.uri.utils.ComponentIndex.DOMAIN],
      parts[goog.uri.utils.ComponentIndex.PORT], path,
      parts[goog.uri.utils.ComponentIndex.QUERY_DATA],
      parts[goog.uri.utils.ComponentIndex.FRAGMENT]);
};


/**
 * Standard supported query parameters.
 * @enum {string}
 */
goog.uri.utils.StandardQueryParam = {

  /** Unused parameter for unique-ifying. */
  RANDOM: 'zx'
};


/**
 * Sets the zx parameter of a URI to a random value.
 * @param {string} uri Any URI.
 * @return {string} That URI with the "zx" parameter added or replaced to
 *     contain a random string.
 */
goog.uri.utils.makeUnique = function(uri) {
  return goog.uri.utils.setParam(
      uri, goog.uri.utils.StandardQueryParam.RANDOM,
      goog.string.getRandomString());
};

//third_party/javascript/password_alert/chrome/content_script.js
/**
 * @license
 * Copyright 2011 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Receives keyboard events and sends keyboard events to
 * background.js via sendMessage.
 * @author adhintz@google.com (Drew Hintz)
 */

'use strict';

goog.provide('passwordalert');

// These requires must also be added to content_script_test.html
goog.require('goog.format.EmailAddress');
goog.require('goog.string');
goog.require('goog.uri.utils');


/**
 * URL prefix for the SSO/login page.
 * @private {string}
 */
passwordalert.sso_url_;


/**
 * Selector for the form element on the SSO login page.
 * @private {string}
 */
passwordalert.sso_form_selector_;


/**
 * Selector for the password input element on the SSO login page.
 * @private {string}
 */
passwordalert.sso_password_selector_;


/**
 * Selector for the username input element on the SSO login page.
 * @private {string}
 */
passwordalert.sso_username_selector_;


/**
 * The corp email domain, e.g. "company.com".
 * Can also be a list of domains, such as "1.example.com,2.example.com".
 * @private {string}
 */
passwordalert.corp_email_domain_;


/**
 * URL prefix for the GAIA login page.
 * @private {string}
 * @const
 */
passwordalert.GAIA_URL_ = 'https://accounts.google.com/';


// TODO(adhintz) See if /SecondFactor and /b/0/VerifiedPhoneInterstitial URLs
// are still used and if not, then delete them.
/**
 * URL prefixes under GAIA_URL_ that indicate a correct password.
 * @private {Array.<string>}
 * @const
 */
passwordalert.GAIA_CORRECT_ = [
  'https://accounts.google.com/SecondFactor',
  'https://accounts.google.com/b/0/VerifiedPhoneInterstitial',
  'https://accounts.google.com/signin/newfeatures',
  'https://accounts.google.com/signin/selectchallenge',
  'https://accounts.google.com/signin/challenge',
  'https://accounts.google.com/signin/privacyreminder',
  'https://accounts.google.com/signin/v2/challenge/ipp'
];


/**
 * URL prefixes under GAIA_URL_ that indicate a *not* correct password.
 * We only need entries that are within GAIA_CORRECT_ prefixes.
 * @private {Array.<string>}
 * @const
 */
passwordalert.GAIA_INCORRECT_ = [
  'https://accounts.google.com/signin/challenge/sl/password',
  'https://accounts.google.com/signin/challenge/pwd/1'
];


/**
 * URL prefix for changing GAIA password.
 * @private {string}
 * @const
 */
passwordalert.CHANGE_PASSWORD_URL_ =
    'https://myaccount.google.com/signinoptions/password';


/**
 * URL prefix for enforced changing GAIA password.
 * @private {string}
 * @const
 */
passwordalert.ENFORCED_CHANGE_PASSWORD_URL_ =
    'https://accounts.google.com/speedbump/changepassword';


/**
 * YouTube check connection page.
 * @private {string}
 * @const
 */
passwordalert.YOUTUBE_CHECK_URL_ =
    'https://accounts.youtube.com/accounts/CheckConnection';


/**
 * Namespace for chrome's managed storage.
 * @private {string}
 * @const
 */
passwordalert.MANAGED_STORAGE_NAMESPACE_ = 'managed';


/**
 * HTML snippets from corp login pages.  Default values are for consumers.
 * @private {Array.<string>}
 */
passwordalert.corp_html_ = [
  'One account. All of Google.',
  'Sign in with your Google Account',
  '<title>Sign in - Google Accounts',
  '//ssl.gstatic.com/accounts/ui/logo_2x.png'
];


/**
 * HTML snippets from corp login pages that are more specific.  Default
 * values are for consumers.
 * @private {Array.<string>}
 */
passwordalert.corp_html_tight_ = [
  // From https://accounts.google.com/ServiceLogin
  ('<input id="Passwd" name="Passwd" placeholder="Password" class="" ' +
   'type="password">'),
  ('<input id="Passwd" name="Passwd" type="password" placeholder="Password" ' +
   'class="">'),
  '<input id="signIn" name="signIn" class="rc-button rc-button-submit" ',
  // From https://accounts.google.com/b/0/EditPasswd?hl=en
  '<div class="editpasswdpage main content clearfix">'
];


/**
 * If the current page looks like corp_html_. undefined means not checked yet.
 * @private {boolean}
 */
passwordalert.looks_like_google;


/**
 * Email address of the security admin.
 * @private {string}
 */
passwordalert.security_email_address_;


/**
 * Whitelist of domain suffixes that are not phishing or checked for password.
 * Default values are for Google login pages. https is not specified, however
 * these default domains are preloaded HSTS in Chrome.
 * @private {Array.<string>}
 */
passwordalert.whitelist_top_domains_ = [
  'accounts.google.com',
  'login.corp.google.com',
  'myaccount.google.com'
];


/**
 * The URL for the current page.
 * @private {string}
 */
passwordalert.url_ = '';


/**
 * The referrer for the current page.
 * @private {string}
 */
passwordalert.referrer_ = '';


/**
 * If Password Alert is running on the current page.
 * @private {boolean}
 */
passwordalert.isRunning_ = false;


/**
 * Is password alert used in enterprise environment.  If false, then it's
 * used by individual consumer.
 * @private {boolean}
 */
passwordalert.enterpriseMode_ = false;


/**
 * Indicates that the managed policy has been set. Required to complete init.
 * @private {boolean}
 */
passwordalert.policyLoaded_ = false;


/**
 * Indicates the DOM has been loaded. Required to complete initialization.
 * @private {boolean}
 */
passwordalert.domContentLoaded_ = false;


/**
 * Key for the allowed hosts object in chrome storage.
 * @private {string}
 * @const
 */
passwordalert.ALLOWED_HOSTS_KEY_ = 'allowed_hosts';


/**
 * Set the managed policy values into the configurable variables.
 * @param {function()} callback Executed after policy values have been set.
 * @private
 */
passwordalert.setManagedPolicyValuesIntoConfigurableVariables_ =
    function(callback) {
  chrome.storage.managed.get(function(managedPolicy) {
    if (Object.keys(managedPolicy).length == 0) {
      passwordalert.enterpriseMode_ = false;
    } else {
      passwordalert.enterpriseMode_ = true;
      passwordalert.corp_email_domain_ =
          managedPolicy['corp_email_domain'].replace(/@/g, '').toLowerCase();
      passwordalert.security_email_address_ =
          managedPolicy['security_email_address'];
      passwordalert.sso_form_selector_ = managedPolicy['sso_form_selector'];
      passwordalert.sso_password_selector_ =
          managedPolicy['sso_password_selector'];
      passwordalert.sso_url_ = managedPolicy['sso_url'];
      passwordalert.sso_username_selector_ =
          managedPolicy['sso_username_selector'];

      // For the policies below, we want to append the user-provided policies
      // to the extension-provided defaults.
      if (managedPolicy['whitelist_top_domains']) {
        Array.prototype.push.apply(
            passwordalert.whitelist_top_domains_,
            // filter empty values
            managedPolicy['whitelist_top_domains'].filter(String)
        );
      }
      if (managedPolicy['corp_html']) {
        Array.prototype.push.apply(
            passwordalert.corp_html_,
            managedPolicy['corp_html']
        );
      }
      if (managedPolicy['corp_html_tight']) {
        Array.prototype.push.apply(
            passwordalert.corp_html_tight_,
            managedPolicy['corp_html_tight']
        );
      }

    }
    passwordalert.policyLoaded_ = true;
    callback();
  });
};


// This switch style is a bit verbose with lots of properties. Perhaps it
// would be cleaner to have a list of allowed properties and do something like
// if (changedPolicy in listOfPolicies)
//   passwordalert[changedPolicy + '_'] = newPolicyValue;
/**
 * Handle managed policy changes by updating the configurable variables.
 * @param {!Object} changedPolicies Object mapping each policy to its
 *     new values.  Policies that have not changed will not be present.
 *     For example:
 *     {
 *      report_url: {
 *        newValue: "https://passwordalert222.example.com/report/"
 *        oldValue: "https://passwordalert111.example.com/report/"
 *        }
 *     }
 * @param {!string} storageNamespace The name of the storage area
 *     ("sync", "local" or "managed") the changes are for.
 * @private
 */
passwordalert.handleManagedPolicyChanges_ =
    function(changedPolicies, storageNamespace) {
  if (storageNamespace == passwordalert.MANAGED_STORAGE_NAMESPACE_) {
    var subtractArray = function(currentPolicyArray, oldPolicyArray) {
      return currentPolicyArray.filter(
          function(val) { return oldPolicyArray.indexOf(val) < 0; }
      );
    };

    var changedPolicy;
    for (changedPolicy in changedPolicies) {
      if (!passwordalert.enterpriseMode_) {
        passwordalert.enterpriseMode_ = true;
      }
      var newPolicyValue = changedPolicies[changedPolicy]['newValue'];
      var oldPolicyValue = changedPolicies[changedPolicy]['oldValue'];
      switch (changedPolicy) {
        case 'corp_email_domain':
          passwordalert.corp_email_domain_ =
              newPolicyValue.replace(/@/g, '').toLowerCase();
          break;
        case 'corp_html':
          // Remove the old values before appending new ones.
          passwordalert.corp_html_ = subtractArray(
              passwordalert.corp_html_,
              oldPolicyValue);
          Array.prototype.push.apply(
              passwordalert.corp_html_,
              newPolicyValue);
          break;
        case 'corp_html_tight':
          passwordalert.corp_html_tight_ = subtractArray(
              passwordalert.corp_html_tight_,
              oldPolicyValue);
          Array.prototype.push.apply(
              passwordalert.corp_html_tight_,
              newPolicyValue);
          break;
        case 'security_email_address':
          passwordalert.security_email_address_ = newPolicyValue;
          break;
        case 'sso_form_selector':
          passwordalert.sso_form_selector_ = newPolicyValue;
          break;
        case 'sso_password_selector':
          passwordalert.sso_password_selector_ = newPolicyValue;
          break;
        case 'sso_url':
          passwordalert.sso_url_ = newPolicyValue;
          break;
        case 'sso_username_selector':
          passwordalert.sso_username_selector_ = newPolicyValue;
          break;
        case 'whitelist_top_domains':
          passwordalert.whitelist_top_domains_ = subtractArray(
              passwordalert.whitelist_top_domains_,
              oldPolicyValue.filter(String));  // filter empty values
          Array.prototype.push.apply(
              passwordalert.whitelist_top_domains_,
              newPolicyValue.filter(String));  // filter empty values
          break;
      }
    }
  }
};


/**
 * Complete page initialization.  This is executed after managed policy values
 * have been set.
 *
 * Save or delete any existing passwords. Listen for form submissions on
 * corporate login pages.
 * @private
 */
passwordalert.completePageInitializationIfReady_ = function() {
  if (!passwordalert.policyLoaded_ || !passwordalert.domContentLoaded_) {
    return;
  }

  // Ignore YouTube login CheckConnection because the login page makes requests
  // to it, but that does not mean the user has successfully authenticated.
  if (goog.string.startsWith(passwordalert.url_,
                             passwordalert.YOUTUBE_CHECK_URL_)) {
    return;
  }
  if (passwordalert.sso_url_ &&
      goog.string.startsWith(passwordalert.url_,
                             passwordalert.sso_url_)) {
    var loginForm = document.querySelector(passwordalert.sso_form_selector_);
    if (loginForm) {  // null if the user gets a Password Change Warning.
      chrome.runtime.sendMessage({action: 'deletePossiblePassword'});
      loginForm.addEventListener(
          'submit', passwordalert.saveSsoPassword_, true);
    } else {
      // This handles the case where user is redirected to a page that starts
      // with sso url upon a successful sso login.
      chrome.runtime.sendMessage({action: 'savePossiblePassword'});
    }
  } else if (goog.string.startsWith(passwordalert.url_,
      passwordalert.ENFORCED_CHANGE_PASSWORD_URL_)) {
    // This change password page does not have any email information.
    // So we fallback to the email already set in background.js because users
    // will be prompted to login before arriving here.
    var email;
    chrome.runtime.sendMessage({action: 'getEmail'}, function(response) {
      email = response;
    });
    var changePasswordForm = document.getElementById('gaia_changepasswordform');
    changePasswordForm.addEventListener(
        'submit', function() {
          chrome.runtime.sendMessage({
            action: 'setPossiblePassword',
            email: email,
            password: changePasswordForm.Passwd.value
          });
        }, true);
  } else if (goog.string.startsWith(passwordalert.url_,
                                    passwordalert.GAIA_URL_)) {
    if (passwordalert.is_gaia_correct_(passwordalert.url_)) {
      chrome.runtime.sendMessage({action: 'savePossiblePassword'});
    } else {
      // Delete any previously considered password in case this is a re-prompt
      // when an incorrect password is entered, such as a ServiceLoginAuth page.
      chrome.runtime.sendMessage({action: 'deletePossiblePassword'});
      var loginForm = document.querySelector('#view_container > form');
      // The chooser is no longer a gaia_loginform, so verify we're on a password
      // entry page by finding a form in a view_container.
      if (loginForm && document.getElementById('Email')) {
        loginForm.addEventListener(
            'submit', passwordalert.saveGaiaPassword_, true);
      } else if (document.getElementById('hiddenEmail') &&
                 document.getElementsByName('password')){
        // TODO(adhintz) Avoid adding event listeners if they already exist.
        document.getElementById("passwordNext").addEventListener('click',function (){
          passwordalert.saveGaia2Password_(null);
        });
        // Pressing spacebar on the Next button will trigger save.
        document.getElementById("passwordNext").addEventListener('keydown', function(evt) {
          if (evt.keyCode == 32) {
            passwordalert.saveGaia2Password_(evt);
          }
        }, true);
        // Pressing enter anywhere on the page will trigger save.
        document.addEventListener('keydown', function(evt) {
          if (evt.keyCode == 13) {
            passwordalert.saveGaia2Password_(evt);
          }
        }, true);
        window.onbeforeunload = passwordalert.saveGaia2Password_;
      }
    }
  } else if (goog.string.startsWith(passwordalert.url_,
                                    passwordalert.CHANGE_PASSWORD_URL_)) {
    chrome.runtime.sendMessage({action: 'deletePossiblePassword'});
    // Need to wait until the change password page has finished loading
    // before listener can be added.
    window.onload = function() {
      var allButtons = document.querySelectorAll('div[role=button]');
      var changePasswordButton = allButtons[allButtons.length - 1];
      changePasswordButton.addEventListener(
          'click', passwordalert.saveChangedPassword_, true);
      // Pressing spacebar on the change password button will trigger save.
      changePasswordButton.addEventListener(
          'keydown', function(evt) {
            if (evt.keyCode == 32) {
              passwordalert.saveChangedPassword_();
            }
          }, true);
      // Pressing enter anywhere on the change password page will trigger save.
      document.addEventListener(
          'keydown', function(evt) {
            if (evt.keyCode == 13) {
              passwordalert.saveChangedPassword_();
            }
          }, true);
    };
  } else {  // Not a Google login URL.
    if (!passwordalert.whitelistUrl_() &&
        passwordalert.looksLikeGooglePageTight_()) {
      chrome.runtime.sendMessage({
        action: 'looksLikeGoogle',
        url: passwordalert.url_,
        referer: passwordalert.referrer_,
        securityEmailAddress: passwordalert.security_email_address_});
    }
    chrome.runtime.sendMessage({action: 'savePossiblePassword'});
  }

  chrome.runtime.sendMessage({action: 'statusRequest'}, function(response) {
    passwordalert.stop_();
    passwordalert.start_(response);
  });
};

/**
 * Returns true if the URL indicates that the password is correct.
 * @param {string} url The page's URL.
 * @return {boolean} True if the URL indicates the password is correct.
 * @private
 */
passwordalert.is_gaia_correct_ = function(url) {
  var ret = false;
  passwordalert.GAIA_CORRECT_.forEach( function(prefix) {
    if (goog.string.startsWith(url, prefix)) {
      ret = true;
    }
  });
  if (ret) {  // Filter out exceptions which indicate password is not correct.
    passwordalert.GAIA_INCORRECT_.forEach( function(prefix) {
      if (goog.string.startsWith(url, prefix)) {
        ret = false;
      }
    });
  }
  return ret;
};

/**
 * Sets variables to enable watching for passwords being typed. Called when
 * a message from the options_subscriber arrives.
 * @param {string} msg JSON object containing password lengths and OTP mode.
 * @private
 */
passwordalert.start_ = function(msg) {
  try {
    var state = JSON.parse(msg);
    if (state.passwordLengths && state.passwordLengths == 0) {
      passwordalert.stop_(); // no passwords, so no need to watch
      return;
    }
  } catch (e) {} // Silently swallow any parser errors.

  if ((passwordalert.sso_url_ &&
      goog.string.startsWith(passwordalert.url_,
                             passwordalert.sso_url_)) ||
      goog.string.startsWith(passwordalert.url_, passwordalert.GAIA_URL_) ||
      passwordalert.whitelistUrl_()) {
    passwordalert.stop_(); // safe URL, so no need to watch it
    return;
  }

  passwordalert.isRunning_ = true;

  // If the current site is marked as Always Ignore, then passwordalert.stop_().
  if (!passwordalert.enterpriseMode_) {
    chrome.storage.local.get(
        passwordalert.ALLOWED_HOSTS_KEY_,
        function(allowedHosts) {
          var currentHost = window.location.origin;
          if (Object.keys(allowedHosts).length > 0 &&
              allowedHosts[passwordalert.ALLOWED_HOSTS_KEY_][currentHost]) {
            passwordalert.stop_();
          }
        });
  }

  passwordalert.looksLikeGooglePage_();  // Run here so that it's cached.
};


/**
 * Disables watching on the current page.
 * @private
 */
passwordalert.stop_ = function() {
  passwordalert.isRunning_ = false;
};


/**
 * Called on each key press. Checks the most recent possible characters.
 * @param {Event} evt Key press event.
 * @export
 */
passwordalert.handleKeypress = function(evt) {
  if (!passwordalert.isRunning_) return;

  if (!evt.isTrusted) return;  // Verify event generated by a user.

  chrome.runtime.sendMessage({
    action: 'handleKeypress',
    keyCode: evt.charCode,
    typedTimeStamp: evt.timeStamp,
    url: passwordalert.url_,
    referer: passwordalert.referrer_,
    looksLikeGoogle: passwordalert.looksLikeGooglePage_()
  });
};


/**
 * Called on each key down. Checks the most recent possible characters.
 * @param {Event} evt Key down event.
 * @export
 */
passwordalert.handleKeydown = function(evt) {
  if (!passwordalert.isRunning_) return;

  if (!evt.isTrusted) return;  // Verify event generated by a user.

  chrome.runtime.sendMessage({
    action: 'handleKeydown',
    keyCode: evt.keyCode,
    shiftKey: evt.shiftKey,
    typedTimeStamp: evt.timeStamp,
    url: passwordalert.url_,
    referer: passwordalert.referrer_,
    looksLikeGoogle: passwordalert.looksLikeGooglePage_()
  });
};


/**
 * Called on each paste. Checks the entire pasted string to save on cpu cycles.
 * @param {Event} evt Paste event.
 * @export
 */
passwordalert.handlePaste = function(evt) {
  if (!passwordalert.isRunning_) return;

  // Legitimate paste events should have the clipboardData set.
  if (evt.clipboardData === undefined) {
    return;
  }

  // Legitimate paste events should have increasing timeStamps.
  if (evt.timeStamp <= passwordalert.lastKeypressTimeStamp_) {
    return;
  }
  passwordalert.lastKeypressTimeStamp_ = evt.timeStamp;

  chrome.runtime.sendMessage({
    action: 'checkString',
    password: evt.clipboardData.getData('text/plain').trim(),
    url: passwordalert.url_,
    referer: passwordalert.referrer_,
    looksLikeGoogle: passwordalert.looksLikeGooglePage_()
  });
};


/**
 * Called when SSO login page is submitted. Sends possible password to
 * background.js.
 * @param {Event} evt Form submit event that triggered this. Not used.
 * @private
 */
passwordalert.saveSsoPassword_ = function(evt) {
  if (passwordalert.validateSso_()) {
    var username =
        document.querySelector(passwordalert.sso_username_selector_).value;
    var password =
        document.querySelector(passwordalert.sso_password_selector_).value;
    if (username.indexOf('@') == -1) {
      username += '@' + passwordalert.corp_email_domain_.split(',')[0].trim();
    }
    chrome.runtime.sendMessage({
      action: 'setPossiblePassword',
      email: username,
      password: password
    });
  }
};

// TODO(adhintz) See if the old GAIA login page is used any where.
// If not, delete this function.
/**
 * Called when the GAIA page is submitted. Sends possible
 * password to background.js.
 * @param {Event} evt Form submit event that triggered this. Not used.
 * @private
 */
passwordalert.saveGaiaPassword_ = function(evt) {
  var loginForm = document.getElementById('gaia_loginform');
  var email = loginForm.Email ?
      goog.string.trim(loginForm.Email.value.toLowerCase()) : '';
  var password = loginForm.Passwd ? loginForm.Passwd.value : '';
  if ((passwordalert.enterpriseMode_ &&
      !passwordalert.isEmailInDomain_(email)) ||
      goog.string.isEmptyString(goog.string.makeSafe(password))) {
    return;  // Ignore generic @gmail.com logins or for other domains.
  }
  chrome.runtime.sendMessage({
    action: 'setPossiblePassword',
    email: email,
    password: password
  });
};


/**
 * Called when the new GAIA page is unloaded. Sends possible
 * password to background.js.
 * @param {Event} evt BeforeUnloadEvent that triggered this. Not used.
 * @private
 */
passwordalert.saveGaia2Password_ = function(evt) {
  var emailInput = document.getElementById('hiddenEmail');
  var email = emailInput ?
      goog.string.trim(emailInput.value.toLowerCase()) : '';
  var passwordInputs = document.getElementsByName('password');
  if (!passwordInputs || passwordInputs.length != 1) {
    return;
  }
  var password = passwordInputs[0].value;
  if (!email || !password) {
    return;
  }
  if ((passwordalert.enterpriseMode_ &&
      !passwordalert.isEmailInDomain_(email)) ||
      goog.string.isEmptyString(goog.string.makeSafe(password))) {
    return;  // Ignore generic @gmail.com logins or for other domains.
  }
  chrome.runtime.sendMessage({
    action: 'setPossiblePassword',
    email: email,
    password: password
  });
};


/**
 * Called when GAIA password is changed. Sends possible password to
 * background.js.
 * @private
 */
passwordalert.saveChangedPassword_ = function() {
  // To ensure that only a valid password is saved, wait and see if we
  // navigate away from the change password page.  If we stay on the
  // same page, then the password is not valid and should not be saved.
  var passwordChangeStartTime = Date.now();
  window.onbeforeunload = function() {
    if ((Date.now() - passwordChangeStartTime) > 1000) {
      return;
    }
    var dataConfig =
        document.querySelector('div[data-config]').getAttribute('data-config');
    var start = dataConfig.indexOf('",["') + 4;
    var end = dataConfig.indexOf('"', start);
    var email = dataConfig.substring(start, end);

    if (goog.format.EmailAddress.isValidAddress(email)) {
      chrome.runtime.sendMessage({
        action: 'setPossiblePassword',
        email: email,
        password:
            document.querySelector('input[aria-label="New password"]').value
      });
      return;
    }
    console.log('Parsed email on change password page is not valid: %s', email);
  };
};


/**
 * Checks if the email address is for an enterprise mode configured domain.
 * @param {string} email Email address to check.
 * @return {boolean} True if email address is for a configured corporate domain.
 * @private
 */
passwordalert.isEmailInDomain_ = function(email) {
  var domains = passwordalert.corp_email_domain_.split(',');
  for (var i = 0; i < domains.length; i++) {
    if (goog.string.endsWith(email, '@' + domains[i].trim())) {
      return true;
    }
  }
  return false;
};


/**
 * Checks if the sso login page is filled in.
 * @return {boolean} Whether the sso login page is filled in.
 * @private
 */
passwordalert.validateSso_ = function() {
  var username = document.querySelector(passwordalert.sso_username_selector_);
  var password = document.querySelector(passwordalert.sso_password_selector_);
  if ((username && !username.value) ||
      (password && !password.value)) {
    console.log('SSO data is not filled in.');
    return false;
  }
  return true;
};


/**
 * Detects if this page looks like a Google login page.
 * For example, a phishing page would return true.
 * Cached so it only runs once per content_script load.
 * @return {boolean} True if this page looks like a Google login page.
 * @private
 */
passwordalert.looksLikeGooglePage_ = function() {
  if (passwordalert.looks_like_google_ == true ||
      passwordalert.looks_like_google_ == false) {
    return passwordalert.looks_like_google_;
  }
  var allHtml = document.documentElement.innerHTML.slice(0, 120000);
  for (var i = 0; i < passwordalert.corp_html_.length; i++) {
    if (allHtml.indexOf(passwordalert.corp_html_[i]) >= 0) {
      passwordalert.looks_like_google_ = true;
      return true;
    }
  }
  passwordalert.looks_like_google_ = false;
  return false;
};


/**
 * Detects if this page looks like a Google login page, but with a more
 * strict set of rules to reduce false positives.
 * For example, a phishing page would return true.
 * @return {boolean} True if this page looks like a Google login page.
 * @private
 */
passwordalert.looksLikeGooglePageTight_ = function() {
  // Only look in the first 120,000 characters of a page to avoid
  // impacting performance for large pages. Although an attacker could use this
  // to avoid detection, they could obfuscate the HTML just as easily.
  var allHtml = document.documentElement.innerHTML.slice(0, 120000);
  for (var i = 0; i < passwordalert.corp_html_tight_.length; i++) {
    if (allHtml.indexOf(passwordalert.corp_html_tight_[i]) >= 0) {
      return true;
    }
  }
  return false;
};


/**
 * Detects if the page is whitelisted as not a phishing page or for password
 * typing.
 *
 * Make sure if user whitelists example.com, then evilexample.com
 * will not pass the whitelist.
 *
 * @return {boolean} True if this page is whitelisted.
 * @private
 */
passwordalert.whitelistUrl_ = function() {
  var domain = goog.uri.utils.getDomain(passwordalert.url_) || '';
  for (var i = 0; i < passwordalert.whitelist_top_domains_.length; i++) {
    var whitelisted_domain = passwordalert.whitelist_top_domains_[i];
    if (domain == whitelisted_domain) {
      return true;
    }

    var whitelisted_domain_as_suffix = whitelisted_domain;
    if (!goog.string.startsWith(whitelisted_domain, '.')) {
      whitelisted_domain_as_suffix = '.' + whitelisted_domain_as_suffix;
    }
    if (goog.string.endsWith(domain, whitelisted_domain_as_suffix)) {
      return true;
    }
  }
  return false;
};

/**
 * Called when the DOM has loaded. Sets up observers the dynamic login page.
 *
 * @private
 */
passwordalert.domReadyCheck_ = function() {
  passwordalert.domContentLoaded_ = true;

  if (goog.string.startsWith(passwordalert.url_, passwordalert.GAIA_URL_)) {
    var config = { attributes: true, childList: true, characterData: true };
    var observer = new MutationObserver(passwordalert.completePageInitializationIfReady_);
    observer.observe(document.body, config);
  }

  passwordalert.completePageInitializationIfReady_();
};


// If we're in an iframe get the parent's href.
var url = location.href.toString();
if (url == 'about:blank') {
  passwordalert.url_ = window.parent.location.href;
  passwordalert.referrer_ = '';
} else {
  passwordalert.url_ = url;
  passwordalert.referrer_ = document.referrer.toString();
}

// Listen for policy changes and then set initial managed policy:
chrome.storage.onChanged.addListener(passwordalert.handleManagedPolicyChanges_);
passwordalert.setManagedPolicyValuesIntoConfigurableVariables_(
    passwordalert.completePageInitializationIfReady_);

window.addEventListener('keypress', passwordalert.handleKeypress, true);
window.addEventListener('keydown', passwordalert.handleKeydown, true);
window.addEventListener('paste', passwordalert.handlePaste, true);

chrome.runtime.onMessage.addListener(
    /**
     * @param {string} msg JSON object containing valid password lengths.
     */
    function(msg) {
      passwordalert.stop_();
      passwordalert.start_(msg);
    }
);

document.addEventListener('DOMContentLoaded', passwordalert.domReadyCheck_);
// Check to see if we already missed DOMContentLoaded:
if (document.readyState == 'interactive' ||
    document.readyState == 'complete' ||
    document.readyState == 'loaded') {
  passwordalert.domReadyCheck_();
}

