import { readFileSync, writeFileSync } from 'node:fs';
import * as d3 from 'd3';

const year = 2025;
const firstYear = 2016;
const departmentType = 'Type 1';
const names = { 'Royal Infirmary of Edinburgh at Little France': 'Royal Infirmary of Edinburgh' };
const shortNames = JSON.parse(readFileSync('data/shortNames.json', 'utf8'));

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const clean = (name) => names[name.trim()] ?? name.trim();

const activity = d3.csvParse(readFileSync('data/raw/Level_1_Activity.csv', 'utf8'));

const emergency = activity.filter((d) => d.AttendanceCategory === 'All' && d.DepartmentType === departmentType);
const yearOf = (d) => Math.floor(d.Month / 100);
const years = d3
  .rollups(
    emergency.filter((d) => yearOf(d) >= firstYear),
    (rows) => new Set(rows.map((d) => d.Month)).size,
    yearOf
  )
  .map(([year, months]) => ({ year, months }))
  .sort((a, b) => a.year - b.year);
const waitsByYear = d3.rollup(
  emergency,
  (rows) => ({
    waits: d3.sum(rows, (d) => +d.NumberOver12HoursEpisode),
    waits8: d3.sum(rows, (d) => +d.NumberOver8HoursEpisode),
    attendances: d3.sum(rows, (d) => +d.NumberOfAttendancesEpisode)
  }),
  (d) => clean(d.HospitalName),
  yearOf
);

const hospitals = d3
  .rollups(
    emergency.filter((d) => yearOf(d) === year),
    (rows) => ({ board: rows[0].HBName, waits2025: d3.sum(rows, (d) => +d.NumberOver12HoursEpisode) }),
    (d) => clean(d.HospitalName)
  )
  .map(([name, values]) => ({
    id: slug(name),
    name,
    shortName: shortNames[name],
    ...values,
    waitsByYear: years.map(({ year }) => ({ year, ...(waitsByYear.get(name).get(year) ?? { waits: 0, waits8: 0, attendances: 0 }) }))
  }))
  .sort((a, b) => d3.ascending(a.name, b.name));

writeFileSync('src/data/hospitals.json', `${JSON.stringify(hospitals, null, 2)}\n`);
writeFileSync('src/data/years.json', `${JSON.stringify(years, null, 2)}\n`);
