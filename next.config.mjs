const isPages=process.env.GITHUB_ACTIONS==='true';
const repo=process.env.GITHUB_REPOSITORY?.split('/')[1]||'';
const nextConfig={output:'export',images:{unoptimized:true},trailingSlash:true,...(isPages&&repo?{basePath:`/${repo}`,assetPrefix:`/${repo}/`}:{})};
export default nextConfig;
