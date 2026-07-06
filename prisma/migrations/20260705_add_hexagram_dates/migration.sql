-- Migration manuelle pour ajouter les colonnes dateDebut et dateFin à la table Hexagram
--
ALTER TABLE "Hexagram"
ADD COLUMN "dateDebut" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "dateFin" TIMESTAMP WITH TIME ZONE;

-- Index pour optimiser les requêtes par période
CREATE INDEX "idx_hexagram_dates"
ON "Hexagram" ("dateDebut", "dateFin");
