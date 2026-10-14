# Dartdoc Comments for Public APIs

Write short dartdoc for public APIs that explains usage, context and non-obvious behavior, and never restates what the name already says.

- **Be concise and relevant.**  
  Only document what is not obvious from the code or name. Less is more.

- **Focus on usage and context.**  
  Explain when, why, or how to use a class or function, not how it works internally.  
  For widgets, mention where or in which flow they are used, or what makes them unique (e.g., "Used after onboarding", "Disables button until form is valid", "Redirects if already authenticated").

- **Highlight non-obvious behaviors and corner cases.**  
  Note side effects, state management, navigation, error handling, or anything that could trip up a developer.

- **Require documentation only for public APIs.**  
  Private APIs may use dartdoc when it adds useful context, but documentation is optional.

- **Avoid boilerplate and restating the obvious.**  
  Never write comments like "Login screen for <appName>" or "This is a controller for authentication".

- **For enums:**  
  Add dartdoc to the enum itself and all its members unless it is very obvious (e.g., `enum DeviceState { on, off; }`).

- **For single-class files:**  
  Add a dartdoc comment to the class, especially if it is the only class in the file or has a 1:1 connection to another class.

- **Do not use the word "interface" for UI.**  
  Use UI/page/section/panel or another fitting word to avoid confusion with programming interfaces.
