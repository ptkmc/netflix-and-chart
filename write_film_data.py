import json
import urllib.request
import urllib.parse


def parse_titles(films):
    title_list = []
    for f in films:
        title_list.append({"t": f["Title"]})
    return title_list


def fetch_titles(titles):
    res = []
    for t in titles:
        with urllib.request.urlopen("http://www.omdbapi.com/?" + urllib.parse.urlencode(t) + "&apikey=thewdb") as url:
            data = json.loads(url.read().decode())
            res.append(data)
    return res


with open('netflix-original-drama-films.json', 'r') as infile:
    films = json.load(infile)
    titles = parse_titles(films)
    film_data = fetch_titles(titles)

with open('film_data.json', 'w') as outfile:
    json.dump(film_data, outfile)
