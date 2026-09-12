import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API server-side endpoint
  app.post("/api/audit", async (req, res) => {
    try {
      const { currentScore, failedItems = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6KaCT9gqQHnn5KFlj1ybz9ZcSPcHqsnHm6814P4FvKnFQ";

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY no configurada." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `
Actúa como un Analista de la Oficina de Gestión Académica experto en gestión de aulas virtuales y estándares institucionales.
Tu objetivo es generar un informe de auditoría técnica basado en el "CHECK LIST PLANIFICADOR ACADÉMICO".

Contexto:
- Nota Final: ${currentScore}/20.
- Ítems pendientes (puntuación 0): ${failedItems.length > 0 ? (failedItems as string[]).join(", ") : "Ninguno (Cumplimiento total)"}.

Debes seguir ESTRICTAMENTE este formato de respuesta en Markdown (No incluyas el título "ANÁLISIS GEMINI IA" ya que está en la UI):

Estimado/a docente,

Reciba un cordial saludo desde la **Oficina de Gestión Académica**. Tras realizar la auditoría técnica de su espacio en la plataforma, hemos valorado positivamente el nivel de estructuración actual de su planificador académico, el cual refleja un sólido compromiso con el estándar institucional, alcanzando una calificación de **${currentScore}/20**.

Con el objetivo de alcanzar la excelencia académica y asegurar que su Planificador Académico cumpla con el estándar , he identificado el área de oportunidad necesaria para optimizar la experiencia de aprendizaje de sus estudiantes. A continuación, presento el análisis técnico y las acciones de mejora para el ítem pendiente:

**Análisis de Mejora para el Planificador Académico**
${(failedItems as string[])
  .map(
    (item) => `
**Ítem faltante:** ${item}.
**Diagnóstico:** [Explica por qué es fundamental este ítem para garantizar la consolidación del aprendizaje y  tener todos los dumentaciín necesaria. Usa términos como "La organización de los docuemtos de l planificador academico son escenciales", "La gestion del planificador académico", etc.]
**Acción de mejora:** [Brinda una instrucción técnica clara de qué debe implementar el docente para solventar este punto y elevar su calificación al puntaje máximo. Menciona nombres de secciones sugeridas como "Material Complementario" o "Recursos de Profundización".]
`
  )
  .join("\n")}

Tono: Profesional, alentador, técnico y formal.
Importante: Si no hay ítems pendientes, felicita al docente por su excelente trabajo y cumplimiento del Planificador Académico
`;

      const candidateModels = ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-3.8-flash"];
      let feedbackText: string | undefined;
      let lastError: any = null;

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          if (response.text) {
            feedbackText = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`Attempt with model ${model} failed, trying fallback...`, err);
        }
      }

      if (feedbackText) {
        return res.json({ feedback: feedbackText });
      }

      console.error("All Gemini model attempts failed:", lastError);
      return res.status(500).json({
        error: "No se pudo completar el análisis de mejora continua en este momento.",
      });
    } catch (error: any) {
      console.error("Server API error:", error);
      return res.status(500).json({
        error: error.message || "Error interno del servidor.",
      });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
