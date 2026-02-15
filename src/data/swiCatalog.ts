// SWI Document Database - EVConnect Service Work Instructions
// Auto-generated from Google Drive folder structure

export interface SWIDocument {
  id: string;
  filename: string;
  title: string;
  chargerModels: string[];
  issueTypes: string[];
  serviceCategories: string[];
  priority: string[];
  description: string;
  estimatedTime: string;
  requiredParts: string[];
  driveUrl: string;
}

export const SWI_CATALOG: SWIDocument[] = [
  // ==================== COMMON SWIs (All Charger Types) ====================
  {
    id: "swi_comn_016",
    filename: "SWI-COMN-016 Touch-Up Paint Application.pdf",
    title: "Touch-Up Paint Application",
    chargerModels: ["ALL"],
    issueTypes: ["cosmetic damage", "paint damage", "exterior damage", "appearance"],
    serviceCategories: ["cosmetic", "maintenance", "exterior"],
    priority: ["P3", "P4"],
    description: "Procedures for applying touch-up paint to repair cosmetic damage on charger exteriors.",
    estimatedTime: "30min - 1 hour",
    requiredParts: ["Touch-up paint"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_comn_131",
    filename: "SWI-COMN-131 MPLAB IPE Installation_Rev.A.pdf",
    title: "MPLAB IPE Installation",
    chargerModels: ["ALL"],
    issueTypes: ["software installation", "programming", "firmware"],
    serviceCategories: ["software", "installation", "programming"],
    priority: ["P3"],
    description: "Installation and setup procedures for MPLAB IPE programming software.",
    estimatedTime: "1-2 hours",
    requiredParts: ["None - software only"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_comn_149",
    filename: "SWI-COMN-149 Will Call and Shipping Instructions.pdf",
    title: "Will Call and Shipping Instructions",
    chargerModels: ["ALL"],
    issueTypes: ["shipping", "logistics", "parts order", "will call"],
    serviceCategories: ["logistics", "administrative"],
    priority: ["P4"],
    description: "Procedures for handling will call pickups and shipping instructions for parts and equipment.",
    estimatedTime: "15-30 minutes",
    requiredParts: ["Varies"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_comn_106",
    filename: "SWI-COMN-106 Charger Exterior Cleaning.pdf",
    title: "Charger Exterior Cleaning",
    chargerModels: ["ALL"],
    issueTypes: ["cleaning", "maintenance", "preventive maintenance", "appearance"],
    serviceCategories: ["maintenance", "cleaning", "preventive"],
    priority: ["P3", "P4"],
    description: "Standard procedures for cleaning and maintaining charger exterior surfaces.",
    estimatedTime: "30min - 1 hour",
    requiredParts: ["Cleaning supplies"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_comn_105",
    filename: "SWI-COMN-105 Rust Mitigation Process.pdf",
    title: "Rust Mitigation Process",
    chargerModels: ["ALL"],
    issueTypes: ["rust", "corrosion", "exterior damage", "weathering"],
    serviceCategories: ["maintenance", "repair", "exterior"],
    priority: ["P2", "P3"],
    description: "Procedures for identifying, treating, and preventing rust on charger components.",
    estimatedTime: "1-3 hours",
    requiredParts: ["Rust treatment supplies"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_comn_066",
    filename: "SWI-COMN-066 Part Return Process_Rev.D.pdf",
    title: "Part Return Process",
    chargerModels: ["ALL"],
    issueTypes: ["part return", "warranty return", "rma", "logistics"],
    serviceCategories: ["administrative", "logistics", "warranty"],
    priority: ["P4"],
    description: "Process for returning defective or warranty parts to manufacturer.",
    estimatedTime: "30min",
    requiredParts: ["None"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },

  // ==================== LEVEL 2 CHARGERS ====================
  {
    id: "swi_lvl2_136",
    filename: "SWI-LVL2-136 L2 Cable Replacement_Rev.B.pdf",
    title: "L2 Cable Replacement",
    chargerModels: ["L2", "Level 2", "L2_7kW", "L2_11kW", "L2_19kW"],
    issueTypes: ["cable replacement", "cable damage", "charging cable", "worn cable"],
    serviceCategories: ["hardware replacement", "repair"],
    priority: ["P2", "P3"],
    description: "Procedures for replacing damaged or worn Level 2 charging cables.",
    estimatedTime: "1-2 hours",
    requiredParts: ["L2 charging cable assembly"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_lvl2_099_volt",
    filename: "SWI-LVL2-099 Voltage Check with Legal Disclaimer_1.mp4",
    title: "L2 Output Voltage Check",
    chargerModels: ["L2", "Level 2", "L2_7kW", "L2_11kW", "L2_19kW"],
    issueTypes: ["voltage check", "output voltage", "electrical testing", "diagnostics"],
    serviceCategories: ["diagnostics", "testing", "electrical"],
    priority: ["P2"],
    description: "Safety procedures for checking output voltage on Level 2 chargers with proper legal disclaimers.",
    estimatedTime: "30min - 1 hour",
    requiredParts: ["Multimeter", "PPE"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_lvl2_068",
    filename: "SWI-LVL2-068 L2 Display Replacement_Rev.C.pdf",
    title: "L2 Display Screen Replacement",
    chargerModels: ["L2", "Level 2", "L2_7kW", "L2_11kW", "L2_19kW"],
    issueTypes: ["display failure", "screen broken", "display replacement", "touchscreen"],
    serviceCategories: ["hardware replacement", "user interface"],
    priority: ["P3"],
    description: "Replacement procedures for Level 2 charger display screens and touchscreen assemblies.",
    estimatedTime: "2-3 hours",
    requiredParts: ["LCD display assembly"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
  {
    id: "swi_lvl2_091",
    filename: "SWI-LVL2-091 Power Board Assembly Replacement_Rev.F.pdf",
    title: "L2 Power Board Replacement",
    chargerModels: ["L2", "Level 2", "L2_7kW", "L2_11kW", "L2_19kW"],
    issueTypes: ["power board failure", "electrical failure", "not charging", "power issue"],
    serviceCategories: ["hardware replacement", "electrical", "repair"],
    priority: ["P1", "P2"],
    description: "Replacement procedures for Level 2 charger power board assemblies.",
    estimatedTime: "2-4 hours",
    requiredParts: ["Power board assembly"],
    driveUrl: "https://drive.google.com/drive/folders/1oSyDFrB8nFhiKARScPjBWIfnnvtL4sRE"
  },
];
