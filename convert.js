const fs = require('fs');
let code = fs.readFileSync('src/components/sales/plan/SeajongPlanTab.tsx', 'utf8');

// Change export default function to export function SeajongPlanTab
code = code.replace(/export default function SalesPlanPage\(\) \{/, 'export function SeajongPlanTab({ currentStep }: { currentStep: number }) {');

// Remove the `const [currentStep, setCurrentStep] = useState<number>(1);`
code = code.replace(/const \[currentStep, setCurrentStep\] = useState<number>\(1\);\n/, '');

// Find the return block
// It starts with `return (` and ends with `  );`
// Inside it, it has <StandardPage ...> <div ...> <WorkflowCard ...>
// We just want to extract the body of WorkflowCard: 
// The WorkflowCard has a children which is the steps.

// Let's replace the whole return statement
const returnMatch = code.match(/return \([\s\S]*?\n  \);\n\}/);
if (returnMatch) {
  // We want to return a fragment with the steps
  // Instead of complex regex, let's just do:
  // 1. replace `<StandardPage ...>` and `<WorkflowCard ...>` wrappers with `<>`
  let returnBody = returnMatch[0];
  
  // Replace up to the first step
  returnBody = returnBody.replace(/return \([\s\S]*?\{\/\* STEP 1:/, 'return (\n    <>\n      {/* STEP 1:');
  
  // Replace the closing tags
  returnBody = returnBody.replace(/<\/WorkflowCard>[\s\S]*?\n  \);\n\}/, '    </>\n  );\n}');
  
  code = code.substring(0, returnMatch.index) + returnBody;
}

fs.writeFileSync('src/components/sales/plan/SeajongPlanTab.tsx', code);
