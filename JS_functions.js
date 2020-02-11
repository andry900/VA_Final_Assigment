function Load_Map() {
// DEFINE VARIABLES
    let w = 3000;
    let h = 1250;

    // variables for catching min and max zoom factors
    let minZoom;
    let maxZoom;

    // DEFINE FUNCTIONS/OBJECTS
    // Define map projection
    let projection = d3
        .geoEquirectangular()
        .center([0, 15]) // set centre to further North as we are cropping more off bottom of map
        .scale([w / (2 * Math.PI)]) // scale to fit group width
        .translate([w / 2, h / 2]) // ensure centred in group
    ;

    // Define map path
    let path = d3
        .geoPath()
        .projection(projection)
    ;

    // Create function to apply zoom to countriesGroup
    function zoomed() {
        let t = d3
            .event
            .transform
        ;
        countriesGroup.attr("transform", "translate(" + [t.x, t.y] + ")scale(" + t.k + ")");

        if ($("#circles-area").length > 0) {
            let k = d3.event.transform.k;

            $("#circles-area").attr("transform", "translate(" + [t.x, t.y] + ")scale(" + t.k + ")");

            d3.selectAll('circle.white')
                .attr("r", 4/k)
                .attr("stroke-width", 0.5/k);
            d3.selectAll('circle.green')
                .attr("r", 6/k)
                .attr("stroke-width", 0.5/k);
            d3.selectAll('circle.yellow')
                .attr("r", 9/k)
                .attr("stroke-width", 0.5/k);
            d3.selectAll('circle.orange')
                .attr("r", 12/k)
                .attr("stroke-width", 0.5/k);
            d3.selectAll('circle.red')
                .attr("r", 15/k)
                .attr("stroke-width", 0.5/k);
        }
    }

    // Define map zoom behaviour
    let zoom = d3
        .zoom()
        .on("zoom", zoomed)
    ;

    function getTextBox(selection) {
        selection
            .each(function(d) {
                d.bbox = this
                    .getBBox();
            })
        ;
    }

    // Function that calculates zoom/pan limits and sets zoom to default value
    function initiateZoom() {
        // Define a "minzoom" whereby the "Countries" is as small possible without leaving white space at top/bottom or sides
        minZoom = Math.max($("#map-holder").width() / w, $("#map-holder").height() / h);
        // set max zoom to a suitable factor of this value
        maxZoom = 20 * minZoom;
        // set extent of zoom to chosen values
        // set translate extent so that panning can't cause map to move out of viewport
        zoom
            .scaleExtent([minZoom, maxZoom])
            .translateExtent([[0, 0], [w, h]])
        ;
        // define X and Y offset for centre of map to be shown in centre of holder
        let midX = ($("#map-holder").width() - minZoom * w) / 2;
        let midY = ($("#map-holder").height() - minZoom * h) / 2;
        // change zoom transform to min zoom and centre offsets
        svg.call(zoom.transform, d3.zoomIdentity.translate(midX, midY).scale(minZoom));
    }

    // zoom to show a bounding box, with optional additional padding as percentage of box size
    function boxZoom(box, centroid, paddingPerc) {
        let minXY = box[0];
        let maxXY = box[1];
        // find size of map area defined
        let zoomWidth = Math.abs(minXY[0] - maxXY[0]);
        let zoomHeight = Math.abs(minXY[1] - maxXY[1]);
        // find midpoint of map area defined
        let zoomMidX = centroid[0];
        let zoomMidY = centroid[1];
        // increase map area to include padding
        zoomWidth = zoomWidth * (1 + paddingPerc / 100);
        zoomHeight = zoomHeight * (1 + paddingPerc / 100);
        // find scale required for area to fill svg
        let maxXscale = $("svg").width() / zoomWidth;
        let maxYscale = $("svg").height() / zoomHeight;
        let zoomScale = Math.min(maxXscale, maxYscale);
        // handle some edge cases
        // limit to max zoom (handles tiny countries)
        zoomScale = Math.min(zoomScale, maxZoom);
        // limit to min zoom (handles large countries and countries that span the date line)
        zoomScale = Math.max(zoomScale, minZoom);
        // Find screen pixel equivalent once scaled
        let offsetX = zoomScale * zoomMidX;
        let offsetY = zoomScale * zoomMidY;
        // Find offset to centre, making sure no gap at left or top of holder
        let dleft = Math.min(0, $("svg").width() / 2 - offsetX);
        let dtop = Math.min(0, $("svg").height() / 2 - offsetY);
        // Make sure no gap at bottom or right of holder
        dleft = Math.max($("svg").width() - w * zoomScale, dleft);
        dtop = Math.max($("svg").height() - h * zoomScale, dtop);
        // set zoom
        svg
            .transition()
            .duration(500)
            .call(
                zoom.transform,
                d3.zoomIdentity.translate(dleft, dtop).scale(zoomScale)
            );
    }

    // on window resize
    $(window).resize(function() {
        // Resize SVG
        svg
            .attr("width", $("#map-holder").width())
            .attr("height", $("#map-holder").height())
        ;
        initiateZoom();
    });

    // create an SVG
    let svg = d3
        .select("#map-holder")
        .append("svg")
        // set to the same size as the "map-holder" div
        .attr("width", $("#map-holder").width())
        .attr("height", $("#map-holder").height())
        // add zoom functionality
        .call(zoom);

    // get map data
    d3.json("Dataset/world.json",
        function(json) {
            //Bind data and create one path per GeoJSON feature
            countriesGroup = svg.append("g").attr("id", "map");
            // add a background rectangle
            countriesGroup
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", w)
                .attr("height", h);

            // draw a path for each feature/country
            countries = countriesGroup
                .selectAll("path")
                .data(json.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("id", function(d, i) {
                    return "country" + d.properties.iso_a3;
                })
                .attr("class", "country")
                //      .attr("stroke-width", 10)
                //      .attr("stroke", "#ff0000")
                // add a mouseover action to show name label for feature/country
                .on("mouseover", function(d, i) {
                    d3.select("#countryLabel" + d.properties.iso_a3).style("display", "block");
                })
                .on("mouseout", function(d, i) {
                    d3.select("#countryLabel" + d.properties.iso_a3).style("display", "none");
                })
                // add an onclick action to zoom into clicked country
                .on("click", function(d, i) {
                    d3.selectAll(".country").classed("country-on", false);
                    d3.select(this).classed("country-on", true);
                    boxZoom(path.bounds(d), path.centroid(d), 20);
                });
            // Add a label group to each feature/country. This will contain the country name and a background rectangle
            // Use CSS to have class "countryLabel" initially hidden
            let countryLabels = countriesGroup
                .selectAll("g")
                .data(json.features)
                .enter()
                .append("g")
                .attr("class", "countryLabel")
                .attr("id", function(d) {
                    return "countryLabel" + d.properties.iso_a3;
                })
                .attr("transform", function(d) {
                    return (
                        "translate(" + path.centroid(d)[0] + "," + path.centroid(d)[1] + ")"
                    );
                })
                // add mouseover functionality to the label
                .on("mouseover", function(d, i) {
                    d3.select(this).style("display", "block");
                })
                .on("mouseout", function(d, i) {
                    d3.select(this).style("display", "none");
                })
                // add an onlcick action to zoom into clicked country
                .on("click", function(d, i) {
                    d3.selectAll(".country").classed("country-on", false);
                    d3.select("#country" + d.properties.iso_a3).classed("country-on", true);
                    boxZoom(path.bounds(d), path.centroid(d), 20);
                });

            // add the text to the label group showing country name
            countryLabels
                .append("text")
                .attr("class", "countryName")
                .style("text-anchor", "middle")
                .attr("dx", 0)
                .attr("dy", 0)
                .text(function(d) {
                    return d.properties.name;
                })
                .call(getTextBox);
            // add a background rectangle the same size as the text
            countryLabels
                .insert("rect", "text")
                .attr("class", "countryLabelBg")
                .attr("transform", function(d) {
                    return "translate(" + (d.bbox.x - 2) + "," + d.bbox.y + ")";
                })
                .attr("width", function(d) {
                    return d.bbox.width + 4;
                })
                .attr("height", function(d) {
                    return d.bbox.height;
                });
            initiateZoom();
        }
    );

    setTimeout(function(){
        Prepare_Circles_Area(projection);
    }, 1000);
}

/*function Load_CSV() {
    d3.csv("Dataset/Ncov_Inside_Hubei.csv", function(data) {
        let newData = new Array(data.length);

        for (let i = 0; i < data.length; i++) {
            let arrAges, avgAge;
            let number_diseases = 0, arrDiseases;

            if (data[i].age == ("")) {
                data[i].age = Math.floor(Math.random() * 101);
            }
            else if (data[i].age.includes("-")) {
                arrAges = data[i].age.split("-");
                avgAge = (parseInt(arrAges[0]) + parseInt(arrAges[1]))/2;
                data[i].age = Math.round(avgAge);
            }
            else {
                data[i].age = parseInt(data[i].age);
            }

            if (data[i].sex == "") {
                data[i].sex = Math.floor(Math.random() * 2); //0 is female, 1 is male
            } else {
                if (data[i].sex == "female") {
                    data[i].sex = 0;
                }
                else {
                    data[i].sex = 1;
                }
            }

            if (data[i].chronic_diseases != "") {
                arrDiseases = data[i].chronic_diseases.split(",");
                number_diseases = arrDiseases.length;
            }

            newData[i] = [data[i].age, data[i].sex, number_diseases];
        }
        console.log(newData);
    });
}*/

function Prepare_Circles_Area(projection) {
    let g = d3.select("svg")
        .append("g")
        .attr("id", "circles-area")
        .attr("transform", $("#map").attr("transform"));

    Draw_Circles(projection, g, "Dataset/World_Dataset.csv");
}

function Draw_Circles(projection, g, pathDataset) {
    let circle_ID = 0, sumLatitudes = 0, sumLongitudes = 0;
    let circles_data = [];

    d3.csv(pathDataset, function(csv_data) {
        let table_data = new Array(csv_data.length).fill(Array(4));
        let table;

        for (let i = 0; i < csv_data.length; i++) {
            if (table_data[csv_data[i].ID - 1][0] === undefined) {
                let infected_data = [];

                circle_ID++;
                sumLatitudes = parseFloat(csv_data[i].latitude);
                sumLongitudes = parseFloat(csv_data[i].longitude);
                table_data[csv_data[i].ID - 1] = [csv_data[i].ID, csv_data[i].age, csv_data[i].sex, csv_data[i].city, csv_data[i].province,
                    csv_data[i].country, csv_data[i].latitude, csv_data[i].longitude, csv_data[i].number_chroDiseases, csv_data[i].chronic_diseases,
                    csv_data[i].dead_alive];

                infected_data[0] = table_data[csv_data[i].ID - 1];

                let count = 1;
                for (let j = 1; j < csv_data.length; j++) {
                    if (table_data[csv_data[j].ID - 1][0] === undefined) {
                        if (Math.sqrt(Math.pow(parseFloat(csv_data[i].latitude) - parseFloat(csv_data[j].latitude), 2) -
                            Math.pow(parseFloat(csv_data[i].longitude) - parseFloat(csv_data[j].longitude), 2)) <= 0.1) {

                            sumLatitudes += parseFloat(csv_data[j].latitude);
                            sumLongitudes += parseFloat(csv_data[j].longitude);
                            table_data[csv_data[j].ID - 1] = [csv_data[j].ID, csv_data[j].age, csv_data[j].sex, csv_data[j].city, csv_data[j].province,
                                csv_data[j].country, csv_data[j].latitude, csv_data[j].longitude, csv_data[j].number_chroDiseases, csv_data[j].chronic_diseases,
                                csv_data[j].dead_alive];
                            infected_data[count] = table_data[csv_data[j].ID - 1];

                            count++;
                        }
                    }
                }

                circles_data[circle_ID - 1] = [infected_data, projection([sumLongitudes/(infected_data.length), sumLatitudes/(infected_data.length)])];
            }
        }

        circles_data.sort(function(a, b) {
            return a[0].length - b[0].length;
        });

        for (let i = 0; i < circles_data.length; i++) { // for every created circle (cluster of infected)
            let circle_HTML;

            if (circles_data[i][0].length < 10) {   // if the circle contains less then 10 persons
                circle_HTML = g.append("circle")
                    .attr("class", "white")
                    .attr("r", 8);
            } else if (circles_data[i][0].length >= 10 && circles_data[i][0].length < 100) {
                circle_HTML = g.append("circle")
                    .attr("class", "green")
                    .attr("r", 12);
            } else if (circles_data[i][0].length >= 100 && circles_data[i][0].length < 500) {
                circle_HTML = g.append("circle")
                    .attr("class", "yellow")
                    .attr("r", 18);
            } else if (circles_data[i][0].length >= 500 && circles_data[i][0].length < 1000) {
                circle_HTML = g.append("circle")
                    .attr("class", "orange")
                    .attr("r", 24);
            } else {    // if the circle contains more then 999 persons
               circle_HTML = g.append("circle")
                    .attr("class", "red")
                    .attr("r", 30);
            }

            circle_HTML.attr("cx", circles_data[i][1][0])
                .attr("cy", circles_data[i][1][1])
                .on("click", function() {   // circle on click function
                    table.destroy();    // destroy previous DataTable

                    table = $("#infected_table").DataTable({ // create new DataTable with select circle data
                        data: circles_data[i][0],
                        responsive: true,
                        scrollY: "35vh",
                        "scrollX": true
                    });

                    Draw_Histogram(circles_data[i][0], true); // update histogram data
                })
                .append("title") // tooltip with some information of infected inside a circle
                .text(circles_data[i][0][0][3] + ", " + circles_data[i][0][0][4] + ", " + circles_data[i][0][0][5] +
                    "\nN° of infected: " + circles_data[i][0].length);
        }

        // create a DataTable with the infected all over the world
        table = $("#infected_table").DataTable({
            data: table_data,
            responsive: true,
            scrollY: "35vh",
            "scrollX": true
        });

        Draw_Histogram(circles_data, false);
    });
}

function Draw_Histogram(circles_data, bOnClick) {
    let unified_infected_data = [], ages_array = [], grouped_infected_data = [];
    let num_same_age = 0, num_males = 0, num_females = 0, num_dead = 0, num_alive = 0;

    if (bOnClick) {
        unified_infected_data = circles_data;
    } else {
        for(let x = 0; x < circles_data.length; x++) {
            for(let y = 0; y < circles_data[x][0].length; y++) {
                unified_infected_data.push(circles_data[x][0][y]);
            }
        }
    }

    for (let x = 0; x < unified_infected_data.length; x++) {
        if (!ages_array.includes(unified_infected_data[x][1])) {
            ages_array.push(unified_infected_data[x][1]);
            num_same_age = 1;

            if (unified_infected_data[x][2] === "male") {
                num_males = 1;
                num_females = 0;
            } else {
                num_females = 1;
                num_males = 0;
            }

            if (unified_infected_data[x][10] === "alive") {
                num_alive = 1;
                num_dead = 0;
            } else {
                num_dead = 1;
                num_alive = 0;
            }

            for (let y = x + 1; y < unified_infected_data.length; y++) {
                if (unified_infected_data[x][1] === unified_infected_data[y][1]) { // if 2 people have the same age
                    num_same_age++;

                    if (unified_infected_data[y][2] === "male") {
                        num_males++;
                        if (unified_infected_data[y][10] === "alive") {
                            num_alive++;
                        } else {
                            num_dead++;
                        }
                    } else {
                        num_females++;
                        if (unified_infected_data[y][10] === "alive") {
                            num_alive++;
                        } else {
                            num_dead++;
                        }
                    }
                }
            }
            grouped_infected_data.push([parseInt(unified_infected_data[x][1]), num_same_age, num_males, num_females, num_dead, num_alive]);
        }
    }

    console.log(grouped_infected_data);

    let histogram_data = [];
    let num_cases = 0;

    num_males = 0;
    num_females = 0;
    num_dead = 0;
    num_alive = 0;


    let x = grouped_infected_data[0].filter(function (age) {
        return age < 10;
    });

    for(let i = 0; i < grouped_infected_data.length; i++) {
        if (grouped_infected_data[i][0] < 10) {
            num_cases += grouped_infected_data[i][1];
            num_males += grouped_infected_data[i][2];
            num_females += grouped_infected_data[i][3];
            num_dead += grouped_infected_data[i][4];
            num_alive += grouped_infected_data[i][5];
        }
    }

    /*
        let label = [{"age": "< 10 y.o", "quantity": 24},
            {"age": "10-30 y.o", "quantity": 15},
            {"age": "31-50 y.o", "quantity": 37},
            {"age": "51-70 y.o", "quantity": 54},
            {"age": ">71-90 y.o", "quantity": 49},
            {"age": ">90 y.o", "quantity": 79}];

        // set the dimensions and margins of the graph
        let margin = {top: 60, right: 60, bottom: 10, left: 100},
            width = 880 - margin.left - margin.right,
            height = 800 - margin.top - margin.bottom;

        //append the svg object to the div
        let svg = d3.selectAll("#histogram")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + 8*margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // X axis: scale and draw:
        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(data.map((s)=>s.age))
            .padding(0.2);

        svg.append('g')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(xScale))
            .attr("font-size",25);

        // Y axis: scale and draw:
        const yScale = d3.scaleLinear()
            .range([height, 0])
            .domain([0, 100]); // from 0 to the number of tot infected for that circle

        svg.append('g')
            .call(d3.axisLeft(yScale))
            .attr("font-size",25);

        //create the svg for the grid
        svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("transform", function(d) {
                return "translate(" + xScale(d.age) + "," + yScale(d.quantity) + ")"; })
            .attr("width", xScale.bandwidth())
            .attr("height", function(d) { return height - yScale(d.quantity); });

        //create the grid for the X axis
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft()
                .scale(yScale)
                .tickSize(-width, 0, 0)
                .tickFormat(''));

        //append the label for X axis
        svg.append('text')
            .attr('x', -(height / 2.4) - margin.top - 20)
            .attr('y', -margin.left / 2.4 - 10)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr("font-size",35)
            .text('Number of infected cases');

        //append the label for Y axis
        svg.append('text')
            .attr('x', width/2.4 + margin.right)
            .attr('y', height + margin.bottom + 60)
            .attr('text-anchor', 'middle')
            .attr("font-size",35)
            .text('Age group');

        svg.append("text")
            .data(data)
            .attr("dy", "1em")
            .attr("dx", "2em")
            .attr("transform", function(d) {
                return "translate(" + xScale(d.age) + "," + yScale(d.quantity) + ")"; })
            .attr("y", yScale(data))
            .attr("x", xScale(data))
            .attr("font-size",25)
            .attr("fill","white")
            .attr("text-anchor", "middle")
            .text(function(d,i) {return d[i].quantity;});
     */
}


function Draw_PieChart() {

}