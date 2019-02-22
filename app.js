let chartPanelWidth = d3
  .select('#chartPanel')
  .node()
  .getBoundingClientRect().width;

let chartPanelHeight = d3
  .select('#chartPanel')
  .node()
  .getBoundingClientRect().height;

let infoPanelWidth = d3
  .select('#infoPanel')
  .node()
  .getBoundingClientRect().width;

let topPanelHeight = d3
  .select('#topPanel')
  .node()
  .getBoundingClientRect().height;

const margin = { top: 10, right: 30, bottom: 20, left: 20 },
  width = chartPanelWidth - 30 - margin.left - margin.right,
  height = chartPanelHeight - 30 - margin.top - margin.bottom;

var parseDate = d3.timeParse('%Y-%m-%d');

d3.json('./netflix_film_data.json').then(data => {
  data.forEach(film => {
    film.Released = new Date(film.Released);
  });
  data = data.sort((a, b) => {
    return b.Released - a.Released;
  });

  const xScale = d3
    .scaleTime()
    .domain([d3.min(data, d => d.Released), d3.max(data, d => d.Released)])
    .range([0, width]);

  let yDomainState = 'full';
  let dateState = 'year';
  let lineState = false;

  document.querySelector('#yDomainState').addEventListener('click', () => {
    yDomainState === 'full' ? (yDomainState = 'zoom') : (yDomainState = 'full');
    document.querySelector('#full').classList.remove('active');
    document.querySelector('#zoom').classList.remove('active');
    document.querySelector(`#${yDomainState}`).classList += ' active';
    updateY();
  });

  function updateY() {
    svg
      .select('.y-axis')
      .transition()
      .call(
        d3
          .axisLeft(yScale.domain(getYDomain()))
          .tickSize(chartPanelWidth)
          .tickFormat(t => {
            // only show integer tick marks
            if (Math.floor(t) != t) {
              return;
            }
            return t;
          })
      );

    svg
      .selectAll('.dot')
      .transition()
      .attr('cy', d => yScale.domain(getYDomain())(d.imdbRating));
  }

  function getYDomain() {
    if (yDomainState === 'zoom') {
      return [d3.min(data, d => d.imdbRating), d3.max(data, d => d.imdbRating)];
    } else {
      return [0, 10];
    }
  }

  var yScale = d3
    .scaleLinear()
    .domain(getYDomain())
    .range([height, 0]);

  const rScale = d3
    .scaleLinear()
    .domain([
      d3.min(data, d => parseInt(d.imdbVotes.replace(',', ''))),
      d3.max(data, d => parseInt(d.imdbVotes.replace(',', '')))
    ])
    .range([6, 18]);

  var line = d3
    .line()
    .x(function(d, i) {
      return xScale(d.Released);
    })
    .y(function(d) {
      return yScale(d.imdbRating);
    });
  // .curve(d3.curveMonotoneX); // apply smoothing to the line

  var svg = d3
    .select('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  let axisYear;

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(
      d3
        .axisBottom(xScale)
        .tickSize(0)
        // 'Show Months' FEATURE
        // ===========================
        // .tickFormat(date => {
        //   const currentYear = Date.parse(d3.timeYear(date));
        //   if (!axisYear || axisYear !== currentYear) {
        //     axisYear = currentYear;
        //     return d3.timeFormat('%Y')(date);
        //   } else {
        //     return d3.timeFormat('%b')(date);
        //   }
        // })
        .ticks(d3.timeYear)
    );

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${chartPanelWidth})`)
    .call(d3.axisLeft(yScale).tickSize(chartPanelWidth));

  // 'Connect the dots' FEATURE
  // ===========================
  // svg
  //   .append('path')
  //   .datum(data)
  //   .attr('class', 'line');
  // .attr('d', line);

  const getRadius = d => {
    return rScale(parseInt(d.imdbVotes.replace(',', '')));
  };

  svg
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('id', d => d.imdbID)
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.Released))
    .attr('cy', d => yScale(d.imdbRating))
    .attr('r', d => getRadius(d))
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut)
    .on('click', handleClick)
    .on('load', () => {
      console.log('loooad');
    });

  const tooltip = d3
    .select('body')
    .append('div')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden');

  let chartPos = document.getElementById('chartPanel').getBoundingClientRect();

  function handleMouseOver(d, i) {
    let tip = tooltip
      .style('visibility', 'visible')
      .attr('id', d.imdbID)
      .style(
        'top',
        yScale(d.imdbRating) + chartPos.top - getRadius(d) + 13 + 'px'
      )
      .style(
        'left',
        xScale(d.Released) + chartPos.left + margin.left + 14 + 'px'
      )
      .append('div')
      .style('white-space', 'nowrap')
      .attr('class', 'tooltip')
      .html(
        `<div class="tooltip-rating">${d.imdbRating}</div> ${
          d.Title
        } <div class="tooltip-year">(${d.Year})</div>`
      )
      .style('position', 'absolute')
      .style('left', '50%')
      .style('transform', 'translate(-50%, 0)')
      .style('bottom', '0');

    return tip;
  }

  function handleMouseOut() {
    tooltip.selectAll('div').remove();
    return tooltip.style('visibility', 'hidden');
  }

  function handleClick(d) {
    console.log(d);
    const fontSize = parseFloat(
      getComputedStyle(document.querySelector('#infoPanel')).fontSize
    );

    d3.selectAll('.dot-focus')
      .classed('dot-focus', false)
      .classed('dot', true);
    d3.select(this).attr('class', 'dot dot-focus');

    d3.selectAll('#poster')
      .style('max-width', infoPanelWidth - fontSize * 2 + 'px')
      .attr('src', d.Poster);

    d3.select('#poster-background')
      .attr('src', d.Poster)
      .style('width', infoPanelWidth - fontSize * 2 + 'px');

    d3.select('#infoWebsite')
      .attr(
        'href',
        d.Website === 'N/A'
          ? `https://www.netflix.com/${d.Title.replace(/\s/g, '')}`
          : d.Website
      )
      .attr('target', '_blank');

    d3.select('#infoTitle').html(
      `${d.Title} <span class="info-year">(${d.Year})</span>`
    );

    // Update Ratings
    const ratingsIds = {
      'Internet Movie Database': '#imdbRating',
      'Rotten Tomatoes': '#rottenTomatoesRating',
      Metacritic: '#metacriticRating'
    };

    for (let website in ratingsIds) {
      d3.select(ratingsIds[website]).text('—');
    }

    d.Ratings.forEach(r => {
      console.log(d3.select(ratingsIds[r.Source]));
      let rating = r.Value.slice(0, 3)
        .replace('%', '')
        .replace('/', '');

      if (r.Source === 'Rotten Tomatoes') {
        rating = rating + ' %';
      }

      d3.select(ratingsIds[r.Source]).text(rating);
    });

    d3.select('#infoVotes').text(d.imdbVotes);

    // Update Subheader Information
    d3.select('#infoSub').text(
      `${d.Rated === 'N/A' ? '' : d.Rated + ' | '}
      ${d.Genre === 'N/A' ? '' : d.Genre} 
      ${d.Runtime === 'N/A' ? '' : ' | ' + d.Runtime}`
    );

    d3.select('#infoPlot').text(d.Plot);
  }
});
