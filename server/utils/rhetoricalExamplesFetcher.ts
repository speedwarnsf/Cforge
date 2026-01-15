import { supabase } from "../supabaseClient";

export async function fetchRhetoricalExamples() {
  if (!supabase) {
    console.error("Supabase client not available");
    return [];
  }

  const { data, error } = await supabase
    .from("rhetorical_examples")
    .select("*")
    .order("campaign_name", { ascending: true });

  if (error) {
    console.error("Error fetching rhetorical examples:", error);
    return [];
  }

  return data || [];
}