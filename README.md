


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
* Accepts a chain of dependencies (in terms of module names) in the form of a list (with `[ 'A', 'B', ]`
  indicating that `B` depends on `A`, thus, `A` should not call any method defined in `B`, but `B` can use
  any method defined in `A`).
* This is useful in building a 'stratified' chain of mixin modules.
* When given a chain of dependencies, can display all (potential) calls where the dependency chain
  assumption is violated.

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








