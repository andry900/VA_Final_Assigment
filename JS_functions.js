function Load_Map() {
    var map = $("#map");

    const width = map.width();
    const height = map.height();

    const projection = d3.geoMercator()
        .translate([width / 2, height / 2])
        .scale((width - 1) / 2 / Math.PI);

    const path = d3.geoPath()
        .projection(projection);

    const zoom = d3.zoom()
        .scaleExtent([1, 2])
        .on('zoom', zoomed);

    const svg = d3.select('#map').append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g');

    svg.call(zoom);

    d3.json('//unpkg.com/world-atlas@1/world/110m.json')
        .then(world => {
        g.append('path')
            .datum({ type: 'Sphere' })
            .attr('class', 'sphere')
            .attr('d', path);

    g.append('path')
        .datum(topojson.merge(world, world.objects.countries.geometries))
        .attr('class', 'land')
        .attr('d', path);

    g.append('path')
        .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
.attr('class', 'boundary')
        .attr('d', path);
});

    function zoomed() {
        g.selectAll('path') // To prevent stroke width from scaling
            .attr('transform', d3.event.transform);
    }
}