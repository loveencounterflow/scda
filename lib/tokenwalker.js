(function() {
  'use strict';
  var CND, CS, Dba, PATH, Readlines, badge, debug, declare, def, defaults, echo, freeze, glob, help, info, isa, lets, rpr, type_of, types, urge, validate, warn, whisper;

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

  CS = require('coffeescript');

  def = Object.defineProperty;

  //===========================================================================================================
  declare('tw_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.cardinal x.lnr": function(x) {
        return this.isa.cardinal(x.lnr);
      },
      "@isa.text x.source": function(x) {
        return this.isa.text(x.source);
      },
      "@isa.boolean x.verbose": function(x) {
        return this.isa.boolean(x.verbose);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  defaults.tw_cfg = {
    lnr: 0,
    verbose: false
  };

  //===========================================================================================================
  this.Tokenwalker = (function() {
    class Tokenwalker {
      
        //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        this.cfg = {...defaults.tw_cfg, ...cfg};
        validate.tw_cfg(this.cfg);
        def(this.cfg, 'source', {
          enumerable: false,
          value: this.cfg.source
        });
        def(this, 'registry', {
          enumerable: false,
          value: []
        });
        this.collector = null;
        return void 0;
      }

      //-----------------------------------------------------------------------------------------------------------
      * match_tokenline(tokenline) {
        var count, d, i, len, match, pattern, pattern_idx, ref, role, tnr;
        // debug '^434324^', { tokenline, }
        count = 0;
        if (this.cfg.verbose) {
          debug('^345^', tokenline);
        }
        ref = this.patterns;
        for (pattern_idx = i = 0, len = ref.length; i < len; pattern_idx = ++i) {
          [role, pattern] = ref[pattern_idx];
          if ((match = tokenline.match(pattern)) == null) {
            continue;
          }
          count++;
          tnr = parseInt(match.groups.tnr, 10);
          d = this.registry[tnr];
          d = {...d};
          d.name = d.text;
          d.role = role;
          delete d.text;
          yield d;
        }
        if (this.cfg.verbose && count === 0) {
          warn(CND.reverse(" no match "));
        }
        return null;
      }

      //-----------------------------------------------------------------------------------------------------------
      register(d) {
        this.registry.push(d);
        return this.registry.length - 1;
      }

      //-----------------------------------------------------------------------------------------------------------
      push(d) {
        var tnr;
        tnr = this.register(d);
        (this.collector != null ? this.collector : this.collector = []).push(`${tnr}:${d.type}`);
        return null;
      }

      //-----------------------------------------------------------------------------------------------------------
      * flush() {
        var ref, ref1, tokenline;
        if (!(((ref = (ref1 = this.collector) != null ? ref1.length : void 0) != null ? ref : 0) > 0)) {
          return null;
        }
        tokenline = '#' + (this.collector.join('#')) + '#';
        yield* this.match_tokenline(tokenline);
        this.collector = null;
        return null;
      }

      //-----------------------------------------------------------------------------------------------------------
      * walk() {
        var cnr, d, i, len, lnr, ref, text, type;
        ref = CS.tokens(this.cfg.source);
        for (i = 0, len = ref.length; i < len; i++) {
          [type, text, d] = ref[i];
          // { range: [ 0, 1 ], first_line: 0, first_column: 0, last_line: 0, last_column: 0, last_line_exclusive: 0, last_column_exclusive: 1 }
          lnr = this.cfg.lnr + d.first_line + 1;
          cnr = d.first_column + 1;
          type = type.toLowerCase();
          switch (type) {
            case 'indent':
            case 'outdent':
              null;
              break;
            case 'terminator':
              yield* this.flush();
              break;
            default:
              this.push({lnr, cnr, type, text});
          }
        }
        yield* this.flush();
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Tokenwalker.prototype.patterns = [['def', /#(?<tnr>\d+):property#\d+:(?:=|:)#\d+:(?:->|=>)#/], ['def', /#(?<tnr>\d+):property#\d+:(?:=|:)#\d+:param_start#/], ['def', /#(?<tnr>\d+):identifier#\d+:=#\d+:(?:->|=>)#/], ['def', /#(?<tnr>\d+):identifier#\d+:=#\d+:param_start#/], ['call', /#(?<tnr>\d+):property#\d+:call_start#/], ['call', /#(?<tnr>\d+):identifier#\d+:call_start#/]];

    return Tokenwalker;

  }).call(this);

}).call(this);

//# sourceMappingURL=tokenwalker.js.map