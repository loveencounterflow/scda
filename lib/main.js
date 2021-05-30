(function() {
  'use strict';
  var CND, Dba, PATH, Readlines, Tokenwalker, badge, debug, declare, def, defaults, echo, freeze, glob, help, info, isa, lets, rpr, type_of, types, urge, validate, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'SCDA';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  PATH = require('path');

  ({Dba} = require('../../../apps/icql-dba'));

  Readlines = require('n-readlines');

  glob = require('glob');

  ({freeze, lets} = require('letsfreezethat'));

  types = require('./types');

  ({declare, defaults, isa, type_of, validate} = types.export());

  ({Tokenwalker} = require('./tokenwalker'));

  def = Object.defineProperty;

  //===========================================================================================================
  declare('sc_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.schema": function(x) {
        return this.isa.nonempty_text(x.schema);
      },
      "@isa_optional.nonempty_text x.prefix": function(x) {
        return this.isa_optional.nonempty_text(x.prefix);
      },
      "@isa.list x.ignore_names": function(x) {
        return this.isa.list(x.ignore_names);
      },
      "@isa.list x.ignore_spaths": function(x) {
        return this.isa.list(x.ignore_spaths);
      },
      "@isa.boolean x.verbose": function(x) {
        return this.isa.boolean(x.verbose);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  defaults.sc_cfg = {
    schema: 'scda',
    ignore_names: [],
    ignore_spaths: [],
    verbose: false
  };

  //===========================================================================================================
  this.Scda = class Scda {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var prefix, schema;
      // super()
      /* TAINT add validation, defaults */
      this.cfg = {...defaults.sc_cfg, ...cfg};
      validate.sc_cfg(this.cfg);
      ({schema, prefix} = cfg);
      if ((prefix != null) && !prefix.endsWith('/')) {
        prefix = `${prefix}/`;
      }
      /* TAINT make globbing configurable */
      /* TAINT allow to pass in list of paths */
      this._source_glob = PATH.join(prefix, '*.coffee');
      this.cfg.ignore_names = new Set(this.cfg.ignore_names);
      this.cfg.ignore_spaths = new Set(this.cfg.ignore_spaths);
      this.cfg = freeze({...this.cfg, schema, prefix});
      def(this, 'dba', {
        enumerable: false,
        value: new Dba()
      });
      this.dba.open({
        schema,
        ram: true
      });
      this._schema_i = this.dba.as_identifier(schema);
      this.init_db();
      //.......................................................................................................
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    init_db() {
      /* TAINT spath might not be unique */
      /* TAINT use mirage schema with VNRs, refs */
      return this.dba.execute(`-- ---------------------------------------------------------------------------------------------------
create table ${this._schema_i}.paths (
    spath       text unique not null primary key,
    path        text unique not null );
-- ---------------------------------------------------------------------------------------------------
create table ${this._schema_i}.occurrences (
    spath       text    not null,
    lnr         integer not null,
    cnr         integer not null,
    type        text not null,
    role        text not null,
    name        text not null,
  primary key ( spath, lnr, cnr ) );`);
    }

    // -- ---------------------------------------------------------------------------------------------------
    // create table #{@_schema_i}.directories (
    //     id          integer primary key,
    //     path        text unique not null );
    // -- ---------------------------------------------------------------------------------------------------
    // create table #{@_schema_i}.lines (
    //     spath  text    not null,
    //     lnr         integer not null,
    //     line        text    not null,
    //   primary key ( spath, lnr ) );

      //---------------------------------------------------------------------------------------------------------
    add_path(cfg) {
      var path, spath;
      ({path} = cfg);
      if ((this.cfg.prefix != null) && path.startsWith(this.cfg.prefix)) {
        spath = path.slice(this.cfg.prefix.length);
      }
      if (this.cfg.ignore_spaths.has(spath)) {
        return null;
      }
      this.dba.run(`insert into ${this._schema_i}.paths ( spath, path ) values ( $spath, $path );`, {spath, path});
      return spath;
    }

    // #---------------------------------------------------------------------------------------------------------
    // $add_line: ( cfg ) ->
    //   ### TAINT spath might not be unique ###
    //   { spath
    //     lnr
    //     line } = cfg
    //   @dba.run """
    //     insert into #{@_schema_i}.lines ( spath, lnr, line )
    //       values ( $spath, $lnr, $line );""", \
    //     { spath, lnr, line, }
    //   return null

      //---------------------------------------------------------------------------------------------------------
    add_occurrence(cfg) {
      /* TAINT spath might not be unique */
      /* TAINT code duplication */
      /* TAINT use prepared statement */
      var cnr, lnr, name, role, spath, type;
      ({spath, lnr, cnr, type, role, name} = cfg);
      this.dba.run(`insert into ${this._schema_i}.occurrences ( spath, lnr, cnr, type, role, name )
  values ( $spath, $lnr, $cnr, $type, $role, $name );`, {spath, lnr, cnr, type, role, name});
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    add_sources() {
      return this._add_sources_line_by_line();
    }

    //---------------------------------------------------------------------------------------------------------
    _add_sources_line_by_line() {
      var cnr, d, error, i, len, line, lnr, name, outer_lnr, path, readlines, ref, role, source_paths, spath, tokenwalker, type;
      source_paths = glob.sync(this._source_glob);
//.......................................................................................................
      for (i = 0, len = source_paths.length; i < len; i++) {
        path = source_paths[i];
        spath = this.add_path({path});
        if (spath == null) {
          continue;
        }
        debug('^4445^', path);
        readlines = new Readlines(path);
        outer_lnr = 0;
        //.....................................................................................................
        while ((line = readlines.next()) !== false) {
          outer_lnr++;
          line = line.toString('utf-8');
          if (/^\s*$/.test(line)) { // exclude blank lines
            //...................................................................................................
            continue;
          }
          if (/^\s*#/.test(line)) { // exclude some comments
            continue;
          }
          // @$add_line { spath, lnr, line, }
          tokenwalker = new Tokenwalker({
            lnr: outer_lnr,
            source: line,
            verbose: this.cfg.verbose
          });
          try {
            ref = tokenwalker.walk();
            // debug '^4433^', tokenwalker
            //...................................................................................................
            for (d of ref) {
              // debug '^33343^', d
              ({lnr, cnr, type, name, role} = d);
              if (this.cfg.ignore_names.has(name)) {
                continue;
              }
              this.add_occurrence({spath, lnr, cnr, type, role, name});
            }
          } catch (error1) {
            //...................................................................................................
            error = error1;
            if (error.name !== 'SyntaxError') {
              throw error;
            }
            /* TAINT add to table `errors` or similar */
            warn(`^4476^ skipping line ${lnr} of ${spath} because of syntax error: ${rpr(line)}`);
            continue;
          }
        }
      }
      //.......................................................................................................
      return null;
    }

  };

}).call(this);

//# sourceMappingURL=main.js.map