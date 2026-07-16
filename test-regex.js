const url = "https://drive.google.com/file/d/1z9Wek1oOH22OsHGzpE8hD8m9nI9FC-xO/view?usp=sharing";
const m1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
console.log(m1);
