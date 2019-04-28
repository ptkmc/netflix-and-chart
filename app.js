const chartPanelWidth = d3
  .select('#chartPanel')
  .node()
  .getBoundingClientRect().width;

const chartPanelHeight = d3
  .select('#chartPanel')
  .node()
  .getBoundingClientRect().height;

const infoPanelWidth = d3
  .select('#infoPanel')
  .node()
  .getBoundingClientRect().width;

const margin = { top: 14, right: 30, bottom: 20, left: 20 },
  width = chartPanelWidth - margin.left - margin.right - 30,
  height = chartPanelHeight - margin.top - margin.bottom - 30,
  legendCoords = [20, -7],
  rScaleRange = [6, 18];

let currentFilm;
let yScaleZoom = false;
let fullDate = false;
let isMeanLineVisible = false;
let filmIds = [];
let mean = 0;
let minVotes = Infinity;
let maxVotes = 0;

d3.json('./netflix_film_data.json').then(data => {
  data.forEach(film => {
    const votes = parseInt(film.imdbVotes.replace(/,/g, ''));
    film.Released = new Date(film.Released);
    filmIds.push(film.imdbID);
    mean += parseFloat(film.imdbRating);
    minVotes = votes < minVotes ? votes : minVotes;
    maxVotes = votes > maxVotes ? votes : maxVotes;
  });
  data = data.sort((a, b) => {
    return a.Released - b.Released;
  });
  mean = mean / data.length;

  const xScale = d3
    .scaleTime()
    .domain([data[0].Released, data[data.length - 1].Released])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain(getYDomain())
    .range([height, 0]);

  const rScale = d3
    .scaleLinear()
    .domain([minVotes, maxVotes])
    .range(rScaleRange);

  const svg = d3
    .select('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const tooltip = d3
    .select('body')
    .append('div')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden');

  function getYDomain() {
    if (yScaleZoom) {
      return [d3.min(data, d => d.imdbRating), d3.max(data, d => d.imdbRating)];
    } else {
      return [0, 10];
    }
  }

  function updateInfoDate(d) {
    const fullOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (fullDate) {
      const date = d.Released !== 'N/A' ? d.Released : d.Year;
      d3.select('#infoYear')
        .classed('infoFullDate', true)
        .text(date.toLocaleDateString('en-US', fullOptions));
    } else {
      d3.select('#infoYear')
        .text(`(${d.Year})`)
        .classed('infoFullDate', false);
    }
  }

  function updateDate() {
    const xAxis = svg.select('.x-axis').transition();
    let axisYear;

    fullDate = !fullDate;
    updateInfoDate(currentFilm);

    if (fullDate) {
      xAxis.call(
        d3
          .axisBottom(xScale)
          .tickSize(0)
          .tickFormat(date => {
            const currentYear = Date.parse(d3.timeYear(date));
            if (!axisYear || axisYear !== currentYear) {
              axisYear = currentYear;
              return d3.timeFormat('%Y')(date);
            } else {
              return d3.timeFormat('%b')(date);
            }
          })
      );
      const ticks = d3.selectAll('.tick').nodes();
      for (let tick in ticks) {
        const thisTick = d3.select(ticks[tick]);
        // Ticks still being transitioned in have length of 0
        if (thisTick.text().length === 0 || thisTick.text().length === 3) {
          thisTick.classed('light-tick', true);
        } else {
          thisTick.classed('light-tick', false);
        }
      }
    } else {
      xAxis.call(
        d3
          .axisBottom(xScale)
          .tickSize(0)
          .ticks(d3.timeYear)
      );
    }
  }

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

    svg
      .select('.mean-line')
      .transition()
      .attr('x1', xScale(data[0].Released))
      .attr('y1', yScale(mean))
      .attr('x2', xScale(data[data.length - 1].Released) + 20)
      .attr('y2', yScale(mean));
  }

  function handleMouseOver(d) {
    let chartPos = document
      .getElementById('chartPanel')
      .getBoundingClientRect();
    return tooltip
      .style('visibility', 'visible')
      .attr('id', d.imdbID)
      .style(
        'top',
        yScale(d.imdbRating) +
          chartPos.top +
          margin.top -
          rScale(parseInt(d.imdbVotes.replace(',', ''))) +
          3 +
          'px'
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
  }

  function handleMouseOut() {
    tooltip.selectAll('div').remove();
    tooltip.style('visibility', 'hidden');
  }

  function handleClick(d) {
    const fontSize = parseFloat(
      getComputedStyle(document.querySelector('#infoPanel')).fontSize
    );
    const ratingsIds = {
      'Internet Movie Database': '#imdbRating',
      'Rotten Tomatoes': '#rottenTomatoesRating',
      Metacritic: '#metacriticRating'
    };
    currentFilm = d;

    d3.selectAll('.dot-focus')
      .classed('dot-focus', false)
      .classed('dot', true);
    d3.select(`#${d.imdbID}`).attr('class', 'dot dot-focus');

    d3.selectAll('#poster')
      .style('max-width', infoPanelWidth - fontSize * 2 + 'px')
      .attr('src', d.Poster);

    d3.select('#posterBackground')
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

    d3.select('#infoImdbLink')
      .attr('href', `https://www.imdb.com/title/${d.imdbID}`)
      .attr('target', '_blank')
      .style('color', 'inherit');

    d3.select('#infoTitle').text(`${d.Title}`);

    updateInfoDate(d);

    for (let website in ratingsIds) {
      d3.select(ratingsIds[website]).text('—');
    }

    d.Ratings.forEach(r => {
      d3.select(ratingsIds[r.Source]).text('—');
      let rating = r.Value.slice(0, 3)
        .replace('%', '')
        .replace('/', '');

      if (r.Source === 'Rotten Tomatoes') {
        rating += ' %';
      }

      d3.select(ratingsIds[r.Source]).text(rating);
    });

    d3.select('#infoVotes').text(d.imdbVotes);

    d3.select('#infoSub').text(
      `${d.Rated === 'N/A' ? '' : d.Rated + ' | '}
      ${d.Genre === 'N/A' ? '' : d.Genre} 
      ${d.Runtime === 'N/A' ? '' : ' | ' + d.Runtime}`
    );

    d3.select('#infoPlot').text(d.Plot);
  }

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(
      d3
        .axisBottom(xScale)
        .tickSize(0)
        .ticks(d3.timeYear)
    );

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${chartPanelWidth})`)
    .call(d3.axisLeft(yScale).tickSize(chartPanelWidth));

  svg
    .append('line')
    .attr('x1', xScale(data[0].Released))
    .attr('y1', yScale(mean))
    .attr('x2', xScale(data[data.length - 1].Released) + 20)
    .attr('y2', yScale(mean))
    .attr('class', 'mean-line hidden');

  // Legend for dot radius
  svg
    .append('rect')
    .attr('x', legendCoords[0])
    .attr('y', legendCoords[1])
    .attr('width', 130)
    .attr('height', 86)
    .classed('legend', true);

  svg
    .append('circle')
    .attr('cx', legendCoords[0] + 21)
    .attr('cy', legendCoords[1] + 46)
    .attr('r', rScaleRange[0])
    .classed('legend-dot', true);

  svg
    .append('circle')
    .attr('cx', legendCoords[0] + 53)
    .attr('cy', legendCoords[1] + 46)
    .attr('r', (rScaleRange[0] + rScaleRange[1]) / 2)
    .classed('legend-dot', true);

  svg
    .append('circle')
    .attr('cx', legendCoords[0] + 95)
    .attr('cy', legendCoords[1] + 46)
    .attr('r', rScaleRange[1])
    .classed('legend-dot', true);

  svg
    .append('text')
    .text('Number of Votes')
    .attr('x', legendCoords[0] + 13)
    .attr('y', legendCoords[1] + 20)
    .classed('legend-text', true);

  svg
    .append('text')
    .text(`${minVotes.toLocaleString()}`)
    .attr('x', legendCoords[0] + 13)
    .attr('y', legendCoords[1] + 80)
    .classed('legend-stat', true);

  svg
    .append('text')
    .text(`${maxVotes.toLocaleString()}`)
    .attr('x', legendCoords[0] + 69)
    .attr('y', legendCoords[1] + 80)
    .classed('legend-stat', true);

  svg
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('id', d => d.imdbID)
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.Released))
    .attr('cy', d => yScale(d.imdbRating))
    .attr('r', d => rScale(parseInt(d.imdbVotes.replace(',', ''))))
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut)
    .on('click', handleClick);

  d3.select('#zoomBtn').on('click', () => {
    yScaleZoom = !yScaleZoom;
    if (yScaleZoom) {
      d3.select('#full').classed('active', false);
      d3.select('#zoom').classed('active', true);
    } else {
      d3.select('#full').classed('active', true);
      d3.select('#zoom').classed('active', false);
    }
    updateY();
  });

  d3.select('#fullDate').on('input', () => {
    updateDate();
  });

  d3.select('#lucky').on('click', () => {
    handleClick(
      d3
        .select(`#${filmIds[Math.floor(Math.random() * filmIds.length)]}`)
        .datum()
    );
    document.querySelector('#lucky').blur();
  });

  d3.select('#avgRating').on('input', () => {
    const meanLine = d3.select('.mean-line');
    isMeanLineVisible = !isMeanLineVisible;
    isMeanLineVisible
      ? meanLine.classed('hidden', false)
      : meanLine.classed('hidden', true);
  });

  handleClick(d3.select('#tt4357394').datum());
  document.querySelector('#poster').addEventListener('load', () => {
    document.querySelector('#infoInner').classList.remove('hidden');
  });
});
