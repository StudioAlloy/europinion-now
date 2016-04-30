$(function(){
  
  var height = $(window).height()-600,
      width = $('.ge_bargraph').width()-500,
      barPadding = 8,
      current_data_source = 'expenses.general_public_services',
      data = null,
      bars = null,
      reordered = false,
      lineTimer = null;
  //Initial svg
  var svg = d3.select('#ge_bargraph')
              .append('svg')
              .attr({
                'height':height,
                'width':width
              });
  var checkLine = svg.append('line')
                .attr({
                  'x1' : 0,
                  'x2' : width,
                  'y1' : height,
                  'y2' : height,
                  'class': 'checkLine'
                });

  //tooltip settings
  var tip = d3.tip()
              .attr('class', 'd3-tip')
              .offset([-10, 0])
              .html(function(d) {
                var percentage = Object.byString(d, current_data_source);
                var total = d.gdp;
                var value = total*(percentage/100);
                return '<span>'+d.name+'</span><br>'+Math.round( value * 10) / 10+'M';
              });
  svg.call(tip);

  //the button action
  d3.selectAll('.selection button').on('click', function(d) {
    if(!data) return false;
    var button = d3.select(this);
    d3.select('button.selected').attr('class', null);
    button.attr('class', 'selected');
    current_data_source = button.attr('data-source');
    create_graph(current_data_source);
  });

  d3.selectAll('button#reorder').on('click', reorderGraph);
  d3.json('inc/data/data.json', init);

  function init(d)
  {
    data = d;
    checkLine.attr('stroke-dasharray', barPadding+','+(width / data.length - barPadding))
              .attr('x1', (width / data.length - barPadding));
    create_graph(current_data_source);
  }

  //this function fills the svg element with the needed rectangles with the correct dimensions
  //when a button gets clicked it gives a new selection via the selection parameter
  function create_graph(selection)
  {
    var scaleY = d3.scale.linear().range([height, 0]);
    scaleY.domain([0, d3.max(data, function(d){return Object.byString(d, selection)})]);
    bars = svg.selectAll('.bar').data(data.sort(sorting));
    bars.transition()
        .duration(1000)
        .ease('elastic')
        .attr({
          'class': function(d){return 'bar '+d.iso},
          'fill': '#0000ff',
          "x": function(d, i) {return (!reordered) ? d3.select(this).attr('x') : i * (width / data.length);},
          'y': function(d){ return scaleY(Object.byString(d, selection)) },
          'height': function(d){return height - scaleY(Object.byString(d, selection))}
        });

    bars.enter()
      .append("rect")
      .attr({
        'class': function(d){return 'bar '+d.iso},
        "x": function(d, i) {return i * (width / data.length);},
        'y': function(d){ return scaleY(Object.byString(d, selection)) },
        'width': function(d){ return width / data.length - barPadding},
        'height': function(d){return height - scaleY(Object.byString(d, selection))}
      })
      .on('mouseover', function(d){
        clearTimeout(lineTimer);
        tip.show(d);
        var lineY = d3.select(this)
                      .attr('y');
        checkLine
          .style('opacity', '1')
          .transition()
          .duration(400)
                .attr({
                  'y1': lineY,
                  'y2': lineY,
                });
      })
      .on('mouseout', function(d){
        tip.hide(d);
        lineTimer = setTimeout(function(){
          checkLine
            .style('opacity', '0')
            .transition()
            .duration(400)
            .attr({
              'y1' : height,
              'y2' : height,
            });
        }, 800);
      });
  }

  function reorderGraph()
  {
    reordered = !reordered;
    if(reordered)  d3.select(this).attr('class', 'reordered');
    else d3.select(this).attr('class', null);
    bars = svg.selectAll('.bar')
              .sort(sorting);
    bars.transition()
        .duration(1000)
        .ease('elastic')
        .attr({
          "x": function(d, i) {return i * (width / data.length);},
        });
  }

  function sorting(a, b)
  {
    if(reordered)
    {
      return d3.ascending(Object.byString(a, current_data_source), Object.byString(b, current_data_source));
    }
    else{
      return d3.ascending(a.name, b.name);
    }

  }

  Object.byString = function(o, s) {
      s = s.replace(/\[(\w+)\]/g, '.$1');
      s = s.replace(/^\./, '');
      var a = s.split('.');
      for (var i = 0, n = a.length; i < n; ++i) {
          var k = a[i];
          if (k in o) {
              o = o[k];
          } else {
              return;
          }
      }
      return o;
  }
});

$(function(){
  var data = {}; // json
  var matrix_data = [];
  var labels = [];
  var colors = [];
  colors = ['rgba(255,255,255,.65)'];

  d3.json("inc/data/data.json", function(json) {
    init(json);
  });

  function init(json)
  {
    data = json;
    create_import_export_matrix();
    build_graph_circle('import', '#graph_import');
    build_graph_circle('export', '#graph_export');
  }

  function groupTicks(d) {
    var k = (d.endAngle - d.startAngle) / d.value;
    return d3.range(0, d.value, 1000).map(function(v, i) {
      return {
        angle: v * k + d.startAngle,
        label: i % 5 ? null : v / 1000 + "k"
      };
    });
  }

  function build_graph_circle(type, selector)
  {
    var chord = d3.layout.chord()
      .padding(.05)
      .sortSubgroups(d3.descending)
      .matrix(matrix_data[type]);

    var height = parseInt($('.radial_graph_cont').height())-300,
      width = $('.radial_graph_cont').width()-300,
      innerRadius = Math.min(width, height) * .41,
      outerRadius = innerRadius * 1.1;

    var fill = d3.scale.ordinal()
      .domain(d3.range(colors.length))
      .range(colors);

    var svg = d3.select(selector).append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    svg.append("g").selectAll("path")
      .data(chord.groups)
    .enter().append("path")
      .style("fill", function(d) { return fill(d.index); })
      .style("stroke", function(d) { return fill(d.index); })
      .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius));

  var ticks = svg.append("g").selectAll("g")
      .data(chord.groups)
    .enter().append("g").selectAll("g")
      .data(groupTicks)
    .enter().append("g")
      .attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
            + "translate(" + outerRadius + ",0)";
      });
    
  svg.append("g").selectAll("path")
      .data(chord.groups)
    .enter().append("path")
      .style("fill", function(d) { return fill(d.index); })
      .style("stroke", function(d) { return fill(d.index); }).attr('class',function(d){return 'tick_'+d.index})
      .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
      .on("mouseover", fade(true, svg))
      .on("mouseout", fade(false, svg));

  svg.append("g")
      .attr("class", "chord")
    .selectAll("path")
      .data(chord.chords)
    .enter().append("path")
      .attr("d", d3.svg.chord().radius(innerRadius))
      .style("fill", function(d) { return fill(d.target.index); })
      .style("opacity", 1);
    
    svg.selectAll(".chord path")
          .filter(function(d) { return d.source.index == 19 || d.target.index == 19; })
          .classed("selected_radial_thing", true);
  }
 
  function fade(showSelection, svg) {
    return function(g, i) {
      if(showSelection){
        svg.selectAll(".chord path")
          .filter(function(d) { return d.source.index != i && d.target.index != i; })
          .classed("fadeHide", true);
      }else{
        svg.selectAll(".chord path")
          .classed("fadeHide", false)
      }

    };
  }

  function create_import_export_matrix()
  {
    matrix_data['import'] = [];
    matrix_data['export'] = [];
    for(var i in data)
    {
      for(var j in data[i]['import']){
        data[i]['import'][j] = Math.floor(data[i]['import'][j]/1000000);
      }
      for(var j in data[i]['export']){
        data[i]['export'][j] = Math.floor(data[i]['export'][j]/1000000);
      }
      if(data[i]['import'].length > 0){
        matrix_data['import'].push(data[i]['import']);
        matrix_data['export'].push(data[i]['export']);
        labels.push(data[i]['name']);
      }
    }
  }
});


$(function(){
  $('section').each(function(){
    var first_child = $(this).children('div').first();
    if(!first_child.hasClass('fp-tableCell')){
      console.debug('nbu');
      var heightContainer = $('.container', this).height();
      var marginTop = ($(window).height() - heightContainer) / 2;
      $(this).css('padding-top', marginTop);
    }
  });
});