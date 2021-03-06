'use strict';


var Accordion = require('accordion/Accordion'),
    Attribution = require('core/Attribution'),
    QuakemlView = require('origin/QuakemlView'),
    Util = require('util/Util');


var _DEFAULTS = {

};

// Value to display when a value is not provided
var _NOT_REPORTED = '&ndash;';


/**
 * View for displaying magnitude information found in a quakeml.xml {Content}
 * object. This view uses event delegation through a single {Accordion} instance
 * to deal with click events and it manually builds accordion markup for
 * each magnitude item.
 *
 * @param options {Object}
 *     Configuration options for this view. See _initialize method documentation
 *     for details.
 */
var MagnitudesView = function (options) {
  var _this,
      _initialize,

      _accordion;


  options = Util.extend({}, _DEFAULTS, options);
  _this = QuakemlView(options);

  /**
   * Constructor. Initializes a new {MagnitudesView}.
   *
   * @param options {Object}
   *     Configuration options for this view.
   * @param options.model {Content}
   *     The content model to render.
   * @param options.product {Product}
   *     The product that contains the given {Content}. Typically an origin
   *     or phase-data product.
   */
  _initialize = function (/*options*/) {
    _accordion = Accordion({
      el: _this.el
    });
  };


  /**
   * Frees resources allocated to this view.
   *
   */
  _this.destroy = Util.compose(function () {
    _accordion.destroy();

    _accordion = null;

    _initialize = null;
    _this = null;
  }, _this.destroy);

  /**
   * Returns markup for the contributions table. This includes
   * a scrolling wrapper for responsiveness. If no contributions are provided,
   * this markup consists of an informational alert message.
   *
   * @param contributions {Array}
   *     An array of contribution information.
   *
   * @return {String}
   */
  _this.getContributionsMarkup = function (contributions) {
    if (!contributions || contributions.length === 0) {
      return '<p class="alert info">' +
          'No amplitudes contributed for this magnitude.</p>';
    } else {
      return [
        '<div class="horizontal-scrolling">',
          '<table class="magnitude-stations">',
            '<thead>',
              _this.getStationTableHeaderRow(),
            '</thead>',
            '<tbody>',
              contributions.reduce(function (markup, contribution) {
                markup.push(_this.getStationTableRow(contribution));
                return markup;
              }, []).join(''),
            '</tbody>',
          '</table>',
        '</div>'
      ].join('');
    }
  };

  /**
   * Returns markup for the table header row for the station details table.
   *
   * @return {String}
   */
  _this.getStationTableHeaderRow = function () {
    return [
      '<tr>',
        '<th scope="col">',
          '<abbr title="Network Station Channel Location">Channel</abbr>',
        '</th>',
        '<th scope="col">Type</th>',
        '<th scope="col">Amplitude</th>',
        '<th scope="col">Period</th>',
        '<th scope="col">Status</th>',
        '<th scope="col">Magnitude</th>',
        '<th scope="col">Weight</th>',
      '</tr>'
    ].join('');
  };

  /**
   * Returns markup for a single row in the station details table body.
   *
   * @param contribution {Object}
   *     An object containing contribution information. See {quakeml/Quakeml}
   *     for more details.
   *
   * @return {String}
   */
  _this.getStationTableRow = function (contribution) {
    var amp,
        amplitude,
        mag,
        period,
        sncl,
        station,
        stationMagnitude,
        status,
        type,
        weight;

    stationMagnitude = contribution.stationMagnitude;
    amplitude = stationMagnitude.amplitude || {};

    station = stationMagnitude.waveformID || amplitude.waveformID;
    if (station) {
      sncl = station.networkCode +
          ' ' + station.stationCode +
          ' ' + station.channelCode +
          ' ' + station.locationCode;
    } else {
      sncl = _NOT_REPORTED;
    }

    amp = _NOT_REPORTED;
    mag = stationMagnitude.mag.value || _NOT_REPORTED;
    period = _NOT_REPORTED;
    status = amplitude.evaluationMode || stationMagnitude.status || 'automatic';
    type = stationMagnitude.type;
    weight = contribution.weight || _NOT_REPORTED;

    if (amplitude.genericAmplitude) {
      amp = amplitude.genericAmplitude.value + '&nbsp;' +
          (amplitude.unit || '');
    }

    if (amplitude.period) {
      period = amplitude.period.value + ' s';
    }

    if (period === _NOT_REPORTED && amplitude.unit === 's') {
      // quakeml requires a period value to be placed in the amplitude
      // if there is no other amplitude information
      period = amp;
      amp = _NOT_REPORTED;
    }

    return [
      '<tr>',
        '<th scope="row">', sncl, '</th>',
        '<td class="type">', type, '</td>',
        '<td class="amplitude">', amp, '</td>',
        '<td class="period">', period, '</td>',
        '<td class="status">', status, '</td>',
        '<td class="magnitude">', mag, '</td>',
        '<td class="weight">', weight, '</td>',
      '</tr>'
    ].join('');
  };

  /**
   * Returns markup for the magnitude error list item bubble.
   *
   * @param error {String}
   *     The error value to render.
   *
   * @return {String}
   */
  _this.getErrorMarkup = function (error) {
    return [
      '<li>',
        '<span class="bubble">',
          '<span>', error, '</span>',
          '<abbr title="Magnitude Error">Error</abbr>',
        '</span>',
      '</li>'
    ].join('');
  };

  /**
   * Returns markup for a single magnitude found in the quakeml.
   *
   * @param magnitude {Object}
   *     An object containing magntiude information as parsed out of
   *     the quakeml.
   *
   * @return {String}
   */
  _this.getMagnitudeMarkup = function (magnitude) {
    var contributions,
        error,
        mag,
        preferredType,
        source,
        stations,
        type,
        value;

    magnitude = magnitude || {};
    mag = magnitude.mag || {};

    if (magnitude.creationInfo) {
      source = magnitude.creationInfo.agencyID;
    } else {
      source = _this.product.get('source');
    }

    contributions = magnitude.contributions || [];

    type = magnitude.type || _NOT_REPORTED;
    value = mag.value || _NOT_REPORTED;
    error = mag.uncertainty || _NOT_REPORTED;
    stations = magnitude.stationCount || _NOT_REPORTED;
    preferredType = this.product.getProperty('magnitude-type') || '';

    return [
      '<section class="accordion accordion-closed magnitude-view-item">',
        (preferredType.toLowerCase() === type.toLowerCase() ?
            '<h3 class="preferred">': '<h3>' ),
          type,
        '</h3>',
        '<ul class="magnitude-summary">',
          _this.getValueMarkup(value),
          _this.getErrorMarkup(error),
          _this.getStationsMarkup(stations),
          _this.getSourceMarkup(source),
        '</ul>',
        '<a href="javascript:void(null);" class="accordion-toggle">Details</a>',
        '<div class="accordion-content">',
          _this.getContributionsMarkup(contributions),
        '</div>',
      '</section>'
    ].join('');
  };

  /**
   * Returns markup for all the magnitudes found in the quakeml.
   *
   * @param magnitudes {Array}
   *     An array of objects containing magnitude information as parsed
   *     out of the quakeml.
   *
   * @return {String}
   */
  _this.getMagnitudesMarkup = function (magnitudes) {
    magnitudes = magnitudes || [];

    return magnitudes.reduce(function (markup, magnitude) {
      markup.push(_this.getMagnitudeMarkup(magnitude));
      return markup;
    }, []).join('');
  };

  /**
   * Returns markup for the magnitude source list item bubble.
   *
   * @param source {String}
   *     The source value to render.
   *
   * @return {String}
   */
  _this.getSourceMarkup = function (source) {
    return [
      '<li>',
        '<span class="bubble">',
          Attribution.getContributorReference(source),
          '<abbr title="Magnitude Data Source">Source</abbr>',
        '</span>',
      '</li>'
    ].join('');
  };

  /**
   * Returns markup for the magnitude stations list item bubble.
   *
   * @param stations {String}
   *     The stations value to render.
   *
   * @return {String}
   */
  _this.getStationsMarkup = function (stations) {
    return [
      '<li>',
        '<span class="bubble">',
          '<span>', stations, '</span>',
          '<abbr title="Number of Stations">Stations</abbr>',
        '</span>',
      '</li>'
    ].join('');
  };

  /**
   * Returns markup for the magnitude value list item bubble.
   *
   * @param value {String}
   *     The magnitude value to render.
   *
   * @return {String}
   */
  _this.getValueMarkup = function (value) {
    return [
      '<li>',
        '<span class="bubble bubble-border">',
          '<span><strong>', value, '</strong></span>',
          '<abbr title="Magnitude">Mag</abbr>',
        '</span>',
      '</li>'
    ].join('');
  };

  /**
   * Renders the quakeml.
   *
   */
  _this.renderQuakeml = function () {
    var magnitudes;

    if (_this.quakeml) {
      // Already have quakeml, render it
      magnitudes = _this.quakeml.getMagnitudes();

      if (magnitudes.length) {
        _this.el.innerHTML = _this.getMagnitudesMarkup(magnitudes);
      } else {
        _this.el.innerHTML = '<p class="alert info">' +
            'No magnitude data available.</p>';
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MagnitudesView;
