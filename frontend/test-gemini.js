const apiKey = 'AIzaSyCEm_Peuz36vrSz4VJLkWHAtxaJkaYqW3I';

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      console.log("Available models:");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log(`❌ Error: ${data.error?.message || 'Error'}`);
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
  }
}

test();
