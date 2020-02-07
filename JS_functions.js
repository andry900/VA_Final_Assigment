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
            $("#circles-area").attr("transform", "translate(" + [t.x, t.y] + ")scale(" + t.k + ")");
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

function Prepare_Circles_Area(projection) {
    let g = d3.select("svg")
        .append("g")
        .attr("id", "circles-area")
        .attr("transform", $("#map").attr("transform"));

    Draw_Circles(projection, g, "Dataset/Ncov_Inside_Hubei.csv");
    Draw_Circles(projection, g, "Dataset/Ncov_Outside_Hubei.csv");
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

function Draw_Circles(projection, g, pathDataset) {
    d3.csv(pathDataset, function(csv_data) {
        let circle = 0, totInfected = 0, sumLatitudes = 0, sumLongitudes = 0;
        let arrCircles = [];
        let arr = new Array(csv_data.length).fill(Array(4));

        for (let i = 0; i < csv_data.length; i++) {
            if (arr[csv_data[i].ID - 1][0] == undefined && !isNaN(parseInt(csv_data[i].ID)) &&
                !isNaN(parseFloat(csv_data[i].latitude)) && !isNaN(parseFloat(csv_data[i].longitude))) {

                totInfected = 1;
                sumLatitudes = parseFloat(csv_data[i].latitude);
                sumLongitudes = parseFloat(csv_data[i].longitude);
                circle++;
                arr[csv_data[i].ID - 1] = [csv_data[i].ID, circle, csv_data[i].latitude, csv_data[i].longitude];
                for (let j = 1; j < csv_data.length; j++) {
                    if (arr[csv_data[j].ID - 1][0] == undefined && !isNaN(parseInt(csv_data[i].ID)) &&
                        !isNaN(parseFloat(csv_data[i].latitude)) && !isNaN(parseFloat(csv_data[i].longitude))) {

                        if (Math.sqrt(Math.pow(parseFloat(csv_data[i].latitude) - parseFloat(csv_data[j].latitude), 2) -
                            Math.pow(parseFloat(csv_data[i].longitude) - parseFloat(csv_data[j].longitude), 2)) <= 1) {

                            arr[csv_data[j].ID - 1] = [csv_data[j].ID, circle, csv_data[j].latitude, csv_data[j].longitude];
                            totInfected++;
                            sumLatitudes += parseFloat(csv_data[j].latitude);
                            sumLongitudes += parseFloat(csv_data[j].longitude);
                        }
                    }
                }
                arrCircles[circle - 1] = [circle, totInfected, sumLongitudes/totInfected, sumLatitudes/totInfected];
                let coordinates = projection([sumLongitudes/totInfected, sumLatitudes/totInfected]);

                if (totInfected < 10) {
                    g.append("circle")
                        .attr("fill", "white")
                        .attr("stroke", "black")
                        .attr("cx", coordinates[0])
                        .attr("cy", coordinates[1])
                        .attr("r", 4);
                }
                else if (totInfected >= 10 && totInfected < 100) {
                    g.append("circle")
                        .attr("fill", "green")
                        .attr("stroke", "black")
                        .attr("cx", coordinates[0])
                        .attr("cy", coordinates[1])
                        .attr("r", 8);
                }
                else if (totInfected >= 100 && totInfected < 500) {
                    g.append("circle")
                        .attr("fill", "yellow")
                        .attr("stroke", "black")
                        .attr("cx", coordinates[0])
                        .attr("cy", coordinates[1])
                        .attr("r", 16);
                }
                else if (totInfected >= 500 && totInfected < 1000) {
                    g.append("circle")
                        .attr("fill", "orange")
                        .attr("stroke", "black")
                        .attr("cx", coordinates[0])
                        .attr("cy", coordinates[1])
                        .attr("r", 25);
                } else {
                    g.append("circle")
                        .attr("fill", "red")
                        .attr("stroke", "black")
                        .attr("cx", coordinates[0])
                        .attr("cy", coordinates[1])
                        .attr("r", 40);
                }
            }
        }
        console.log(arr);
        console.log(arrCircles);
    });
}

function Mouse_Over(g,tot_infected) {
    g.select("circle").append("text")//appending it to path's parent which is the g(group) DOM
        .attr("transform", function() {
            return "rotate(" + computeTextRotation(d) + ")";
        })
        .attr("x", function() {
            return y(d.y);
        })
        .attr("dx", "6") // margin
        .attr("dy", ".35em") // vertical-align
        .attr("class", "mylabel")//adding a label class
        .text(function() {
            return d.name;
        });
}

function Mouse_Out() {
    function mouseOut() {
        d3.selectAll(".mylabel").remove()//this will remove the text on mouse out
    }
}
