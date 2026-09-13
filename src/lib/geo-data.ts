export interface GeographicDivision {
  name: string;
  defaultGps: { lat: number; lng: number };
  municipalities: string[];
}

export const DOMINICAN_REPUBLIC_PROVINCES: Record<string, GeographicDivision> = {
  "Distrito Nacional": {
    name: "Distrito Nacional",
    defaultGps: { lat: 18.4861, lng: -69.9312 },
    municipalities: ["Santo Domingo Centro", "Bella Vista", "Gazcue", "Piantini", "Naco", "Cristo Rey", "Villa Juana", "Ensanche La Fe", "Ciudad Colonial"]
  },
  "Santo Domingo": {
    name: "Santo Domingo",
    defaultGps: { lat: 18.4900, lng: -69.8500 },
    municipalities: ["Santo Domingo Este", "Santo Domingo Norte", "Santo Domingo Oeste", "Boca Chica", "Los Alcarrizos", "Pedro Brand", "San Antonio de Guerra"]
  },
  "Santiago": {
    name: "Santiago",
    defaultGps: { lat: 19.4517, lng: -70.6970 },
    municipalities: ["Santiago de los Caballeros", "Tamboril", "Villa González", "Licey al Medio", "Puñal", "San José de las Matas", "Navarrete", "Jánico", "Baitoa"]
  },
  "Dajabón": {
    name: "Dajabón",
    defaultGps: { lat: 19.5488, lng: -71.7083 },
    municipalities: ["Dajabón", "Loma de Cabrera", "Restauración", "Partido", "El Pino"]
  },
  "Monte Cristi": {
    name: "Monte Cristi",
    defaultGps: { lat: 19.8486, lng: -71.6458 },
    municipalities: ["Monte Cristi", "Las Matas de Santa Cruz", "Guayubín", "Villa Vásquez", "Castañuelas", "Pepillo Salcedo (Manzanillo)"]
  },
  "Elías Piña": {
    name: "Elías Piña",
    defaultGps: { lat: 18.8789, lng: -71.7031 },
    municipalities: ["Comendador", "Bánica", "El Llano", "Hondo Valle", "Pedro Santana", "Juan Santiago"]
  },
  "Independencia": {
    name: "Independencia",
    defaultGps: { lat: 18.4914, lng: -71.8503 },
    municipalities: ["Jimaní", "Duvergé", "La Descubierta", "Postrer Río", "Cristóbal", "Mella"]
  },
  "Pedernales": {
    name: "Pedernales",
    defaultGps: { lat: 18.0384, lng: -71.7440 },
    municipalities: ["Pedernales", "Oviedo"]
  },
  "San Cristóbal": {
    name: "San Cristóbal",
    defaultGps: { lat: 18.4167, lng: -70.1083 },
    municipalities: ["San Cristóbal", "Bajos de Haina", "Yaguate", "Villa Altagracia", "San Gregorio de Nigua", "Sabana Grande de Palenque", "Cambita Garabitos", "Los Cacaos"]
  },
  "La Altagracia": {
    name: "La Altagracia",
    defaultGps: { lat: 18.6150, lng: -68.7078 },
    municipalities: ["Higüey", "Punta Cana", "Bávaro", "San Rafael del Yuma", "Bayahíbe", "Verón"]
  },
  "Barahona": {
    name: "Barahona",
    defaultGps: { lat: 18.2085, lng: -71.1008 },
    municipalities: ["Barahona", "Cabral", "Enriquillo", "Vicente Noble", "Paraíso", "Las Salinas", "Polo", "Jaquimeyes"]
  },
  "Puerto Plata": {
    name: "Puerto Plata",
    defaultGps: { lat: 19.7934, lng: -70.6884 },
    municipalities: ["San Felipe de Puerto Plata", "Sosúa", "Cabarete", "Imbert", "Luperón", "Villa Montellano", "Altamira", "Guananico", "Los Hidalgos"]
  },
  "La Vega": {
    name: "La Vega",
    defaultGps: { lat: 19.2220, lng: -70.5296 },
    municipalities: ["Concepción de La Vega", "Constanza", "Jarabacoa", "Jima Abajo"]
  },
  "Duarte": {
    name: "Duarte",
    defaultGps: { lat: 19.3000, lng: -70.2500 },
    municipalities: ["San Francisco de Macorís", "Castillo", "Pimentel", "Las Guáranas", "Villa Riva", "Arenoso", "Hostos"]
  },
  "Valverde": {
    name: "Valverde",
    defaultGps: { lat: 19.5519, lng: -71.0781 },
    municipalities: ["Santa Cruz de Mao", "Esperanza", "Laguna Salada"]
  }
};

export const HAITI_DEPARTMENTS: Record<string, GeographicDivision> = {
  "Ouest": {
    name: "Ouest",
    defaultGps: { lat: 18.5392, lng: -72.3364 },
    municipalities: ["Port-au-Prince", "Pétion-Ville", "Delmas", "Carrefour", "Tabarre", "Cité Soleil", "Kenscoff", "Croix-des-Bouquets", "Léogâne", "Arcahaie", "Gressier"]
  },
  "Nord": {
    name: "Nord",
    defaultGps: { lat: 19.7578, lng: -72.2042 },
    municipalities: ["Cap-Haïtien", "Quartier-Morin", "Limonade", "Plaine-du-Nord", "Acul-du-Nord", "Grande-Rivière-du-Nord", "Milot", "Dondon", "Pignon"]
  },
  "Nord-Est": {
    name: "Nord-Est",
    defaultGps: { lat: 19.5492, lng: -71.7242 },
    municipalities: ["Ouanaminthe", "Fort-Liberté", "Trou-du-Nord", "Terrier-Rouge", "Ferrier", "Caracol", "Mont-Organisé", "Sainte-Suzanne"]
  },
  "Artibonite": {
    name: "Artibonite",
    defaultGps: { lat: 19.4500, lng: -72.6833 },
    municipalities: ["Gonaïves", "Saint-Marc", "Dessalines", "Verrettes", "Petite-Rivière-de-l'Artibonite", "Gros-Morne", "Ennery", "Marmelade", "L'Estère"]
  },
  "Centre": {
    name: "Centre",
    defaultGps: { lat: 19.1444, lng: -72.0083 },
    municipalities: ["Hinche", "Mirebalais", "Lascahobas", "Belladère", "Thomassique", "Savanette", "Boucan-Carré", "Cerca-la-Source"]
  },
  "Sud": {
    name: "Sud",
    defaultGps: { lat: 18.1933, lng: -73.7460 },
    municipalities: ["Les Cayes", "Port-Salut", "Aquin", "Torbeck", "Camp-Perrin", "Chantal", "Saint-Louis-du-Sud", "Cavaillon", "Roche-à-Bateau"]
  },
  "Nord-Ouest": {
    name: "Nord-Ouest",
    defaultGps: { lat: 19.9392, lng: -72.8333 },
    municipalities: ["Port-de-Paix", "Saint-Louis-du-Nord", "Jean-Rabel", "Môle-Saint-Nicolas", "Bassin-Bleu", "Bombardopolis", "Chansolme"]
  },
  "Sud-Est": {
    name: "Sud-Est",
    defaultGps: { lat: 18.2342, lng: -72.5347 },
    municipalities: ["Jacmel", "Belle-Anse", "Bainet", "Marigot", "Anse-à-Pitres", "Cayes-Jacmel", "Thiotte", "Grand-Gosier"]
  },
  "Grand'Anse": {
    name: "Grand'Anse",
    defaultGps: { lat: 18.6442, lng: -74.1167 },
    municipalities: ["Jérémie", "Anse-d'Hainault", "Dame-Marie", "Corail", "Pestel", "Moron", "Chambellan"]
  },
  "Nippes": {
    name: "Nippes",
    defaultGps: { lat: 18.4431, lng: -73.0878 },
    municipalities: ["Miragoâne", "Anse-à-Veau", "Petite-Rivière-de-Nippes", "Paillant", "Fonds-des-Nègres", "Baradères"]
  }
};
