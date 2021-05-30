
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'SCDA'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
{ Dba }                   = require '../../../apps/icql-dba'
Readlines                 = require 'n-readlines'
glob                      = require 'glob'
{ freeze
  lets }                  = require 'letsfreezethat'
types                     = require './types'
{ declare
  defaults
  isa
  type_of
  validate }              = types.export()
CS                        = require 'coffeescript'
def                       = Object.defineProperty


#===========================================================================================================
declare 'tw_cfg', tests:
  "@isa.object x":          ( x ) -> @isa.object x
  "@isa.cardinal x.lnr":    ( x ) -> @isa.cardinal x.lnr
  "@isa.text x.source":     ( x ) -> @isa.text x.source
  "@isa.boolean x.verbose": ( x ) -> @isa.boolean x.verbose

#-----------------------------------------------------------------------------------------------------------
defaults.tw_cfg =
  lnr:      0
  verbose:  false

#===========================================================================================================
class @Tokenwalker 

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @cfg        = { defaults.tw_cfg..., cfg..., }
    validate.tw_cfg @cfg
    def @cfg, 'source',   enumerable: false, value: @cfg.source
    def @,    'registry', enumerable: false, value: []
    @collector  = null
    return undefined

  #---------------------------------------------------------------------------------------------------------
  patterns: [
    [ 'def',  /#(?<tnr>\d+):property#\d+:(?:=|:)#\d+:(?:->|=>)#/,   ]
    [ 'def',  /#(?<tnr>\d+):property#\d+:(?:=|:)#\d+:param_start#/, ]
    [ 'def',  /#(?<tnr>\d+):identifier#\d+:=#\d+:(?:->|=>)#/,       ]
    [ 'def',  /#(?<tnr>\d+):identifier#\d+:=#\d+:param_start#/,     ]
    [ 'call', /#(?<tnr>\d+):property#\d+:call_start#/,              ]
    [ 'call', /#(?<tnr>\d+):identifier#\d+:call_start#/,            ]
    ]

  #-----------------------------------------------------------------------------------------------------------
  match_tokenline: ( tokenline ) ->
    # debug '^434324^', { tokenline, }
    count = 0
    debug '^345^', tokenline if @cfg.verbose
    for [ role, pattern, ], pattern_idx in @patterns
      continue unless ( match = tokenline.match pattern )?
      count++
      tnr     = parseInt match.groups.tnr, 10
      d       = @registry[ tnr ]
      d       = { d..., }
      d.name  = d.text
      d.role  = role
      delete d.text
      yield d
    warn CND.reverse " no match " if @cfg.verbose and count is 0
    return null

  #-----------------------------------------------------------------------------------------------------------
  register: ( d ) ->
    @registry.push d
    return @registry.length - 1

  #-----------------------------------------------------------------------------------------------------------
  push: ( d ) ->
    tnr = @register d
    ( @collector ?= [] ).push "#{tnr}:#{d.type}"
    return null

  #-----------------------------------------------------------------------------------------------------------
  flush: ->
    return null unless ( @collector?.length ? 0 ) > 0
    tokenline = '#' + ( @collector.join '#' ) + '#'
    yield from @match_tokenline tokenline
    @collector = null
    return null

  #-----------------------------------------------------------------------------------------------------------
  walk: ->
    for [ type, text, d, ] in CS.tokens @cfg.source
      # { range: [ 0, 1 ], first_line: 0, first_column: 0, last_line: 0, last_column: 0, last_line_exclusive: 0, last_column_exclusive: 1 }
      lnr   = @cfg.lnr + d.first_line + 1
      cnr   = d.first_column + 1
      type  = type.toLowerCase()
      switch type
        when 'indent', 'outdent'
          null
        when 'terminator'
          yield from @flush()
        else
          @push { lnr, cnr, type, text, }
    yield from @flush()
    return null



