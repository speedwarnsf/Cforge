import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

(async () => {
  const { data, error } = await supabase
    .from("concept_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching data:", error);
  } else {
    console.log("Latest 5 rows:");
    console.dir(data, { depth: null });
  }
})();