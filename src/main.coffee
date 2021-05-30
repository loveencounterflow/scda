
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
{ Tokenwalker }           = require './tokenwalker'
def                       = Object.defineProperty


#===========================================================================================================
declare 'sc_cfg', tests:
  "@isa.object x":                        ( x ) -> @isa.object x
  "@isa.nonempty_text x.schema":          ( x ) -> @isa.nonempty_text x.schema
  "@isa_optional.nonempty_text x.prefix": ( x ) -> @isa_optional.nonempty_text x.prefix
  "@isa.list x.ignore_names":             ( x ) -> @isa.list x.ignore_names
  "@isa.list x.ignore_spaths":            ( x ) -> @isa.list x.ignore_spaths
  "@isa.boolean x.verbose":               ( x ) -> @isa.boolean x.verbose

#-----------------------------------------------------------------------------------------------------------
defaults.sc_cfg =
  schema:             'scda'
  ignore_names:       []
  ignore_spaths: []
  verbose:            false


#===========================================================================================================
class @Scda

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    # super()
    ### TAINT add validation, defaults ###
    @cfg = { defaults.sc_cfg..., cfg..., }
    validate.sc_cfg @cfg
    { schema
      prefix }              = cfg
    prefix                  = "#{prefix}/" if prefix? and not prefix.endsWith '/'
    ### TAINT make globbing configurable ###
    ### TAINT allow to pass in list of paths ###
    @_source_glob           = PATH.join prefix, '*.coffee'
    @cfg.ignore_names       = new Set @cfg.ignore_names
    @cfg.ignore_spaths = new Set @cfg.ignore_spaths
    @cfg                    = freeze { @cfg..., schema, prefix, }
    def @, 'dba', enumerable: false, value: new Dba()
    @dba.open { schema, ram: true, }
    @_schema_i              = @dba.as_identifier schema
    @init_db()
    #.......................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  init_db: ->
    ### TAINT spath might not be unique ###
    ### TAINT use mirage schema with VNRs, refs ###
    @dba.execute """
      -- ---------------------------------------------------------------------------------------------------
      create table #{@_schema_i}.paths (
          spath       text unique not null primary key,
          path        text unique not null );
      -- ---------------------------------------------------------------------------------------------------
      create table #{@_schema_i}.occurrences (
          spath       text    not null,
          lnr         integer not null,
          cnr         integer not null,
          type        text not null,
          role        text not null,
          name        text not null,
        primary key ( spath, lnr, cnr ) );
      """
      # -- ---------------------------------------------------------------------------------------------------
      # create table #{@_schema_i}.directories (
      #     id          integer primary key,
      #     path        text unique not null );
      # -- ---------------------------------------------------------------------------------------------------
      # create table #{@_schema_i}.lines (
      #     spath  text    not null,
      #     lnr         integer not null,
      #     line        text    not null,
      #   primary key ( spath, lnr ) );

  #---------------------------------------------------------------------------------------------------------
  add_path: ( cfg ) ->
    { path, }   = cfg
    spath  = path[ @cfg.prefix.length... ] if @cfg.prefix? and path.startsWith @cfg.prefix
    return null if @cfg.ignore_spaths.has spath
    @dba.run """
      insert into #{@_schema_i}.paths ( spath, path ) values ( $spath, $path );""", \
      { spath, path, }
    return spath

  # #---------------------------------------------------------------------------------------------------------
  # $add_line: ( cfg ) ->
  #   ### TAINT spath might not be unique ###
  #   { spath
  #     lnr
  #     line } = cfg
  #   @dba.run """
  #     insert into #{@_schema_i}.lines ( spath, lnr, line )
  #       values ( $spath, $lnr, $line );""", \
  #     { spath, lnr, line, }
  #   return null

  #---------------------------------------------------------------------------------------------------------
  add_occurrence: ( cfg ) ->
    ### TAINT spath might not be unique ###
    ### TAINT code duplication ###
    ### TAINT use prepared statement ###
    { spath
      lnr
      cnr
      type
      role
      name } = cfg
    @dba.run """
      insert into #{@_schema_i}.occurrences ( spath, lnr, cnr, type, role, name )
        values ( $spath, $lnr, $cnr, $type, $role, $name );""", \
      { spath, lnr, cnr, type, role, name, }
    return null

  #---------------------------------------------------------------------------------------------------------
  add_sources: -> @_add_sources_line_by_line()

  #---------------------------------------------------------------------------------------------------------
  _add_sources_line_by_line: ->
    source_paths  = glob.sync @_source_glob
    #.......................................................................................................
    for path in source_paths
      spath  = @add_path { path, }
      continue unless spath?
      debug '^4445^', path
      readlines   = new Readlines path
      outer_lnr   = 0
      #.....................................................................................................
      while ( line = readlines.next() ) isnt false
        outer_lnr++
        line = line.toString 'utf-8'
        #...................................................................................................
        continue if /^\s*$/.test line # exclude blank lines
        continue if /^\s*#/.test line # exclude some comments
        # @$add_line { spath, lnr, line, }
        tokenwalker = new Tokenwalker { lnr: outer_lnr, source: line, verbose: @cfg.verbose, }
        # debug '^4433^', tokenwalker
        #...................................................................................................
        try
          for d from tokenwalker.walk()
            # debug '^33343^', d
            { lnr
              cnr
              type
              name
              role } = d
            continue if @.cfg.ignore_names.has name
            @add_occurrence { spath, lnr, cnr, type, role, name, }
        #...................................................................................................
        catch error
          throw error unless error.name is 'SyntaxError'
          ### TAINT add to table `errors` or similar ###
          warn "^4476^ skipping line #{lnr} of #{spath} because of syntax error: #{rpr line}"
          continue
    #.......................................................................................................
    return null





