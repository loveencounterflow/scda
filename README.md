


# SCDA, a simple Static Code Dependency Analyzer (only for CoffeeScript ATM)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [What it Does](#what-it-does)
- [Shortcomings](#shortcomings)
- [How it is Implemented](#how-it-is-implemented)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# What it Does

* Scans source code for
  * (function and method) definitions, recording their locations
  * (function and method) calls, recording their locations
* Can display *all* (potential) definition sites for all calls.
* Accepts a chain of dependencies (in terms of module file names) in the form of a list (with `[ 'Main.js',
  'X-mixin.js', ]` indicating that `Main.js` depends on `X-mixin.js`, thus,  `X-mixin.js` should not call
  any method defined in  `Main.js`, but `Main.js` can use any method defined in `X-mixin.js`).
* This is useful in building a 'stratified' chain of mixin modules.
* When given a chain of dependencies, can display all (potential) calls where the dependency chain
  assumption is violated.
* A better / more general model would be to group deppendencies and to allow calls within a group; this is
  left for the future.

# Shortcomings

* In order to keep things simple, pattern matching has been implemented with the CoffeeScript tokenizer
  (*not* a parser).
* Conceivably, we could move to a JavaScript parser (and use source maps for the benefits of all the
  CoffeeScripters and TypeScripters out there).
* There *should* be packages on npm that can tell me the location of a method definition when given the call
  site, but I'm not aware of any.
* In its current state, does not allow to do full dependency checking (such as considering code in
  `node_modules`).
* In its current state, does not allow to disentangle ambiguous names.
* As such, all discovered `def`/`call` pairs are only potential, not definitive.

# How it is Implemented

* Works with an in-memory or file based SQLite3 database.
  * This part is a bit of a demo to show that integrating a relational DB into an application can be
    advantageous
* Uses [ICQL/DBA](https://github.com/loveencounterflow/icql-dba) as DB abstraction.








