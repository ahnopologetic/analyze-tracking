const header =
`                                                                                                                                                                                                                            
\u001b[38;5;2m                  ▒▒                   \u001b[39m                                                                       
\u001b[38;5;2m                 ▒▒▒▒                  \u001b[39m                                                                       
\u001b[38;5;2m                 ▒▒▒▒                  \u001b[39m       ████████  ██████    ██████                   ██████             
\u001b[38;5;2m                 ▒▒▒▒                  \u001b[39m     ██████████  ██████    ██████                   ██████             
\u001b[38;5;2m                ▒▒▒▒▒▒                 \u001b[39m    ███████████  ██████    ██████                   ██████             
\u001b[38;5;2m                ▒▒▒▒▒▒                 \u001b[39m    ██████       ██████                             ██████             
\u001b[38;5;2m               ▒▒▒▒▒▒▒▒                \u001b[39m ██████████████  ██████    ██████     █████████     ██████     ██████  
\u001b[38;5;2m              ▒▒▒▒▒▒▒▒▒▒               \u001b[39m ██████████████  ██████    ██████   █████████████   ██████   ███████   
\u001b[38;5;2m             ▒▒▒▒▒▒▒▒▒▒▒▒              \u001b[39m ██████████████  ██████    ██████  ███████  ████    ██████ ████████    
\u001b[38;5;2m         ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           \u001b[39m    ██████       ██████    ██████  ████████         █████████████      
\u001b[38;5;2m  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒    \u001b[39m    ██████       ██████    ██████   ███████████     ████████████       
\u001b[38;5;2m ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   \u001b[39m    ██████       ██████    ██████     ███████████   █████████████      
\u001b[38;5;2m     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓         \u001b[39m    ██████       ██████    ██████          ██████   ███████ ██████     
\u001b[38;5;2m          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             \u001b[39m    ██████       ██████    ██████   ████   ██████   ██████   ██████    
\u001b[38;5;2m             ▓▓▓▓▓▓▓▓▓▓▓▓              \u001b[39m    ██████       ██████    ██████  ██████████████   ██████    ███████  
\u001b[38;5;2m              ▓▓▓▓▓▓▓▓▓▓               \u001b[39m    ██████       ██████    ██████    ██████████     ██████     ███████ 
\u001b[38;5;2m               ▓▓▓▓▓▓▓▓                \u001b[39m                                                                       
\u001b[38;5;2m                ▓▓▓▓▓▓                 \u001b[39m                                                                       
`;

const helpContent = [
  {
    content: header,
    raw: true
  },
  {
    header: '@flisk/analyze-tracking',
    content: 'Automatically document your analytics setup by analyzing tracking code and generating data schemas from tools like Segment, Amplitude, Mixpanel, and more 🚀'
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'help',
        alias: 'h',
        description: 'Display this usage guide.',
        type: Boolean
      },
      {
        name: 'generateDescription',
        alias: 'g',
        description: 'Generate descriptions of fields.',
        type: Boolean,
        defaultValue: false,
        typeLabel: '{underline false}'
      },
      {
        name: 'provider',
        alias: 'p',
        description: 'Specify a provider (options: {italic openai}, {italic gemini})',
        type: String,
        defaultValue: 'openai',
        typeLabel: '{underline openai}'
      },
      {
        name: 'model',
        alias: 'm',
        description: 'Specify a model (ex: {italic gpt-4o-mini}, {italic gemini-2.0-flash-lite-001})',
        type: String,
        defaultValue: 'gpt-4o-mini',
        typeLabel: '{underline gpt-4o-mini}'
      },
      {
        name: 'output',
        alias: 'o',
        description: 'Name of the output file.',
        type: String,
        defaultOption: true,
        typeLabel: '{underline tracking-schema.yaml}'
      },
      {
        name: 'customFunction',
        alias: 'c',
        description: 'Specify a custom tracking function.',
        type: String,
        typeLabel: '{italic yourCustomFunctionName}'
      }
    ]
  },
  {
    header: 'Project Home',
    content: '{underline https://github.com/fliskdata/analyze-tracking}'
  }
];

module.exports = { helpContent };
