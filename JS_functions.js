function Test() {
    let svg=d3.select("svg")
    svg.selectAll("circle")
        .data([10, 50, 100])
        .enter()
        .append("circle")
        .attr("class", "green")
        .attr("cx", function (d) {return d;})
        .attr("cy", function (d) {return d;})
        .attr("r", function(d) {
            return d;
        })
}