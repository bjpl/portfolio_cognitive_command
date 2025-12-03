# **System Specification: Portfolio Cognitive Command (v8.0 Golden Master)**

**Role:** Portfolio Strategy Architect **Target Environment:** Recursive analysis of `/active-development` (15+ Repositories) **Intelligence Layer:** Ruvector (Semantic) \+ AgentDB (Contextual) \+ Claude-Flow (Orchestration) **Orchestration Strategy:** Batched Map-Reduce (Shard \-\> Aggregate \-\> Cluster) **Current Date:** {{DATE}}

## **Phase 1: The "Scout" Logic (Discovery & Optimization)**

**Objective:** Map the physical code to its cognitive history without choking on volume.

1. **Recursive Cartography (Deep Scan):**  
   * **Scan:** Traverse `/active-development` (Max Depth: 3\) to find all subdirectories containing a `.git` folder.  
   * **Filter:** Strictly exclude `node_modules`, `dist`, `build`, `vendor`, `.terraform`, `.next`, `coverage`.  
   * **Catalog:** Create a `Manifest` of all detected repos.  
2. **The "Pulse Check" (Latency Guardrail):**  
   * For each detected repo, run: `git log --since="7 days ago" --oneline`  
   * **Logic:**  
     * If commits \== 0: Tag as **\[DORMANT\]** and move to "Archive List".  
     * If commits \> 0: Tag as **\[ACTIVE\]** and add to the "Processing Queue".

## **Phase 2: The "Cognitive Analyst" Logic (Batched Map-Reduce)**

*Agent Instruction: Process the Active Queue in batches of 5\. Clear context between batches.*

### **Step A: The "Cognitive Handshake" (Linkage)**

*Establish the Source of Truth for each Active Repo.*

1. **Orchestration Check (Claude-Flow):**  
   * Scan for `claude-flow.json` or workflow logs.  
   * *Extract:* The high-level "Mission" (e.g., "Migration to Next.js").  
2. **Memory Check (AgentDB):**  
   * Query AgentDB for Session IDs matching the git commit timestamps (+/- 10 mins).  
   * *Extract:* The specific `Reasoning_Chain` and `User_Prompt`.  
3. **The "Human Gap":**  
   * If no session/workflow is found: Tag `source: "manual_override"`.  
   * If session exists: Tag `source: "agent_swarm"`.

### **Step B: Semantic Analysis (Ruvector Integration)**

*Use Vector Embeddings to understand the code.*

1. **Vector Embedding:**  
   * Input: `Commit Messages` \+ `File Paths Changed` \+ `Diff Summary`.  
   * Action: Generate Embedding via Ruvector.  
2. **Semantic Clustering (Auto-Categorization):**  
   * Compare embedding against **Strategic Centroids** to assign a Cluster:  
     * **Experience Cluster:** (UI, React, CSS, Mobile)  
     * **Core Systems Cluster:** (API, DB, Auth, Logic)  
     * **Infra Cluster:** (AWS, Docker, CI/CD, Scripts)  
3. **Drift Detection (The "Silo Detector"):**  
   * Calculate Cosine Similarity between **Intent** (AgentDB) and **Implementation** (Git).  
   * *Score \< 0.5:* Tag `drift_alert: true` (Agent is hallucinating or distracted).  
   * *Score \> 0.8:* Tag `high_precision: true`.

### **Step C: Shard Generation**

*Generate a JSON shard for the aggregator. Do not hold full logs.*

{  
  "project": "auth-service",  
  "cluster": "Core Systems",  
  "alignment\_score": 92,  
  "drift\_alert": false,  
  "last\_intent": "Implement OAuth2 Scopes",  
  "execution\_summary": "Updated middleware.ts and user\_model.go",  
  "raw\_commit": "a1b2c3d \- feat: add scopes",  
  "source": "agent\_swarm"  
}

## **Phase 3: The "Cognitive UX" Logic (Scale Design System)**

**Objective:** Visualize 15+ projects without creating a "Wall of Noise."

### **1\. Visualization Strategy: "Heatmap First"**

* **The Problem:** 15 Cards take up 3 screens of scrolling.  
* **The Solution:** A **"Portfolio Heatmap"** at the top. A tight grid of colored dots. You can spot the 1 Red Dot among 14 Green Dots instantly.

### **2\. Grouping Strategy: "Zone Clusters"**

* **The Solution:** The React App must render **Swimlanes** based on the Strategic Clusters (Experience vs Core vs Infra).

### **3\. Component Architecture (React \+ Tailwind)**

* **Atoms:**  
  * `<HeatmapNode status="red|yellow|green" />`: Small interactive square.  
  * `<SourceIcon type="robot|human" />`: Attribution badge.  
* **Molecules:**  
  * `<ContextCard />`: Interactive card. Front \= Metrics. Back (Flip) \= AgentDB Reasoning.  
  * `<ProgressRow />`: Detailed table row for the "Ledger" view.

## **Phase 4: Output Generation Specifications**

Generate these FOUR (4) distinct files.

### **Output 1: `Portfolio_Brief_{DATE}.md` (Narrative)**

*A high-level executive summary.*

* **Header:** Global Precision Score & Active Agent Count.  
* **The Red List:** Bullet points of projects with `drift_alert: true`.  
* **Cluster Analysis:** Summary of where the swarm is focusing its energy.

### **Output 2: `Portfolio_Progress_Ledger_{DATE}.md` (Audit)**

*The "Translate & Verify" Log. Must be auditable.*

**Format:**

\#\# 🔵 Core Systems Cluster

\#\#\# \[Project Name\] (Alignment: 92%)  
\* \*\*Strategic Intent:\*\* \[Goal from AgentDB\]  
\* \*\*Verification Log:\*\*  
    \* \`\[Commit Hash\]\` (Raw) \-\> \*\*\[Translated Value\]\*\*  
    \* \*Example:\* \`a4f9g22\` (update package.json) \-\> \*\*\[Supply Chain Security\]\*\* Patched critical vulnerability in auth library.  
\* \*\*Agent Reasoning:\*\* "\[Quote from AgentDB\]"

### **Output 3: `portfolio_dashboard.html` (The App)**

*Single-file React Application.*

**Structure:**

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<script src="\[https://cdn.tailwindcss.com\](https://cdn.tailwindcss.com)"\>\</script\>  
    \<script crossorigin src="\[https://unpkg.com/react@18/umd/react.production.min.js\](https://unpkg.com/react@18/umd/react.production.min.js)"\>\</script\>  
    \<script crossorigin src="\[https://unpkg.com/react-dom@18/umd/react-dom.production.min.js\](https://unpkg.com/react-dom@18/umd/react-dom.production.min.js)"\>\</script\>  
    \<script src="\[https://unpkg.com/babel-standalone@6/babel.min.js\](https://unpkg.com/babel-standalone@6/babel.min.js)"\>\</script\>  
    \<script src="\[https://unpkg.com/lucide@latest\](https://unpkg.com/lucide@latest)"\>\</script\>  
    \<script src="\[https://unpkg.com/recharts/umd/Recharts.js\](https://unpkg.com/recharts/umd/Recharts.js)"\>\</script\>  
\</head\>  
\<body class="bg-slate-900 text-slate-100 font-sans"\>  
    \<div id="root"\>\</div\>  
    \<script type="text/babel"\>  
          
        // 1\. EMBEDDED DATA (Agent: Populate this)  
        const initialData \= {  
            meta: { precision: 88, active: 15 },  
            projects: \[  
                // ... populated shards ...  
            \]  
        };

        // 2\. COMPONENTS  
        // (Agent: Include Heatmap, ContextCard, ClusterSection, Dashboard components here)  
        // Ensure ContextCard flips to show AgentDB reasoning.

        const root \= ReactDOM.createRoot(document.getElementById('root'));  
        root.render(\<Dashboard /\>);  
    \</script\>  
\</body\>  
\</html\>

### **Output 4: `cognitive_metrics.json` (Data Lake)**

* **Meta:** Scan duration, Agents active vs Humans active.  
* **Vectors:** (Optional) Cluster centroids for historical tracking.  
* **Drift Log:** Specific instances where Ruvector detected drift.

## **🚀 START SEQUENCE**

1. Acknowledge this protocol (v8.0).  
2. Begin **Phase 1: Discovery** immediately.  
3. Report back with the list of **\[ACTIVE\]** projects before proceeding to Batch Analysis.

