'use strict';

// Test-only transport challenge. Run the real browser action once, then hold
// its serialized response while real timers/animations continue in the page.
async function withDelayedEvaluationResponse(page, action, delayMs=1000) {
  const evaluate=page.evaluate;
  page.evaluate=async function(...args) {
    page.evaluate=evaluate;
    const result=await evaluate.apply(this,args);
    await new Promise(resolve=>setTimeout(resolve,delayMs));
    return result;
  };
  try {return await action();}
  finally {page.evaluate=evaluate;}
}

module.exports={withDelayedEvaluationResponse};
