import { readFileSync, writeFileSync } from 'node:fs';
import * as d3 from 'd3';

const year = 2025;
const firstYear = 2016;
const departmentType = 'Type 1';
const names = { 'Royal Infirmary of Edinburgh at Little France': 'Royal Infirmary of Edinburgh' };
const shortNames = JSON.parse(readFileSync('data/shortNames.json', 'utf8'));
const bedCodes = JSON.parse(readFileSync('data/bedCodes.json', 'utf8'));
const external = JSON.parse(readFileSync('data/external.json', 'utf8'));
const solution = JSON.parse(readFileSync('src/story/solution.json', 'utf8'));
const admitted = ['Admission to same Hospital', 'Transferred to Other Hospital/Service'];
const ageMidpoints = { 'Under 18': 9, '18-24': 21, '25-39': 32, '40-64': 52, '65-74': 69.5, '75 plus': 82 };
const allAcute = 'All Acute';
const olderBand = '75 plus';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const clean = (name) => names[name.trim()] ?? name.trim();

const activity = d3.csvParse(readFileSync('data/raw/Level_1_Activity.csv', 'utf8'));
const demographics = d3.csvParse(readFileSync('data/raw/Level_2_Demographics.csv', 'utf8'));
const beds = d3.csvParse(readFileSync('data/raw/beds_by_nhs_board_of_treatment_and_specialty.csv', 'utf8'));
const discharges = d3.csvParse(readFileSync('data/raw/opendata_monthly_ae_discharge_202609.csv', 'utf8'));

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

const attendancesBy = (category) =>
  d3.rollup(
    activity.filter((d) => d.AttendanceCategory === category && d.DepartmentType === departmentType && yearOf(d) === year),
    (rows) => d3.sum(rows, (d) => +d.NumberOfAttendancesAll),
    (d) => clean(d.HospitalName)
  );
const unplanned = attendancesBy('Unplanned');
const planned = attendancesBy('New planned');

const people = demographics.filter((d) => d.DepartmentType === departmentType && yearOf(d) === year && d.Age && d.Deprivation);
const aged = demographics.filter((d) => d.DepartmentType === departmentType && yearOf(d) === year && d.Age);
const admissions = discharges.filter((d) => d.DepartmentType === departmentType && yearOf(d) === year && d.Age && admitted.includes(d.Discharge));
const olderShareOf = (rows) => (100 * d3.sum(rows, (d) => (d.Age === olderBand ? +d.NumberOfAttendances : 0))) / d3.sum(rows, (d) => +d.NumberOfAttendances);
const profile = (rows) => ({
  age: d3.sum(rows, (d) => +d.NumberOfAttendances * ageMidpoints[d.Age]) / d3.sum(rows, (d) => +d.NumberOfAttendances),
  deprivation: d3.sum(rows, (d) => +d.NumberOfAttendances * +d.Deprivation) / d3.sum(rows, (d) => +d.NumberOfAttendances)
});
const boards = d3.rollup(people, profile, (d) => d.HBName);

const occupancyAt = d3.rollup(
  beds.filter((d) => d.SpecialtyName === allAcute && d.Quarter.startsWith(year)),
  (rows) => (100 * d3.sum(rows, (d) => +d.TotalOccupiedBeddays)) / d3.sum(rows, (d) => +d.AllStaffedBeddays),
  (d) => d.Location
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
    unplanned2025: unplanned.get(name),
    planned2025: planned.get(name),
    ...boards.get(values.board),
    occupancy: occupancyAt.get(bedCodes.hospitals[name]),
    waitsByYear: years.map(({ year }) => ({ year, ...(waitsByYear.get(name).get(year) ?? { waits: 0, waits8: 0, attendances: 0 }) }))
  }))
  .sort((a, b) => d3.ascending(a.name, b.name));

writeFileSync('src/data/hospitals.json', `${JSON.stringify(hospitals, null, 2)}\n`);
writeFileSync('src/data/scotland.json', `${JSON.stringify({ ...profile(people), occupancy: occupancyAt.get(bedCodes.scotland), olderShare: olderShareOf(aged), olderAdmissionShare: olderShareOf(admissions), olderDelayShare: external.olderDelayShare.value }, null, 2)}\n`);
writeFileSync('src/data/years.json', `${JSON.stringify(years, null, 2)}\n`);

const [firstMonth, lastMonth] = solution.months.map(Number);
const monthly = Object.fromEntries(
  solution.hospitals.map(({ id }) => [
    id,
    d3
      .sort(
        emergency.filter((d) => slug(clean(d.HospitalName)) === id && +d.Month >= firstMonth && +d.Month <= lastMonth),
        (d) => +d.Month
      )
      .map((d) => ({ month: d.Month, waits: +d.NumberOver12HoursEpisode }))
  ])
);
writeFileSync('src/data/monthly.json', `${JSON.stringify(monthly, null, 2)}\n`);
