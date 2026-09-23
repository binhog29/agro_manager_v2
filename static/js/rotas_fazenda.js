const ROTAS_FAZENDA = {
    "alojamento": { x: 86.4, y: 15.1, conexoes: ["no_2"] },
    "no_2":       { x: 80.0, y: 15.1, conexoes: ["alojamento", "no_3"] },
    "no_3":       { x: 77.1, y: 19.8, conexoes: ["no_2", "no_4"] },
    "no_4":       { x: 70.3, y: 20.7, conexoes: ["no_3", "no_5"] },
    "no_5":       { x: 65.5, y: 21.4, conexoes: ["no_4", "no_6"] },
    "no_6":       { x: 60.1, y: 20.5, conexoes: ["no_5", "no_7"] },
    "no_7":       { x: 54.2, y: 22.3, conexoes: ["no_6", "no_8"] },
    "no_8":       { x: 49.5, y: 25.5, conexoes: ["no_7", "no_9"] },
    "no_9":       { x: 48.3, y: 29.5, conexoes: ["no_8", "no_10"] },
    "no_10":      { x: 48.6, y: 36.8, conexoes: ["no_9", "no_11"] },
    "no_11":      { x: 48.8, y: 46.3, conexoes: ["no_10", "no_12"] },
    "no_12":      { x: 49.0, y: 55.1, conexoes: ["no_11", "curral"] },
    "curral":     { x: 59.9, y: 54.4, conexoes: ["no_12"] }
};

window.ROTAS_FAZENDA = ROTAS_FAZENDA;
