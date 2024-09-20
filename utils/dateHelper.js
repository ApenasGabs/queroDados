// utils/dateHelper.js
const months = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
};

const convertDate = (dateString) => {
  let now = new Date();
  const time = dateString.split(",")[1].trim() + ":00";

  if (dateString.includes("Hoje")) {
    return `${now.toISOString().split("T")[0]} ${time}`;
  }

  if (dateString.includes("Ontem")) {
    let yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    return `${yesterday.toISOString().split("T")[0]} ${time}`;
  }

  const [day, month] = dateString.split(" de ");
  const fullYear = now.getFullYear();
  const formattedDate = `${fullYear}-${months[month.split(",")[0].trim()]}-${day
    .trim()
    .padStart(2, "0")} ${time}`;

  return formattedDate;
};

module.exports = { convertDate };
