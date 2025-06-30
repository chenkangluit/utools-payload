import requests
import re
import os
from urllib.parse import urljoin

# 配置参数 - 更新为6.7.2版本
VERSION = "6.7.2"
CSS_URL = f"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/{VERSION}/css/all.min.css"
BASE_URL = f"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/{VERSION}/"
BASE_DIR= f"payload/static/css/"
OUTPUT_DIR = f"payload/static/webfonts/"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_urls(css_content):
    """从CSS内容中提取所有URL"""
    # 正则表达式匹配所有url()中的内容
    pattern = r"url\((?!['\"]?data:)(['\"]?)([^'\"]*?)\1\)"
    urls = re.findall(pattern, css_content)
    # 返回去重后的URL列表
    return sorted(set(url for _, url in urls))


def download_resource(url, output_dir):
    """下载单个资源并保存到指定目录"""
    try:
        # 处理相对路径URL - 确保使用正确的BASE_URL
        if not url.startswith(("http://", "https://")):
            # 修复路径问题：确保URL包含完整的版本路径
            if not url.startswith(f"{VERSION}/") and not url.startswith("webfonts/"):
                url = f"webfonts/{url}"  # 添加缺失的webfonts目录

            # 使用正确的BASE_URL拼接
            absolute_url = urljoin(BASE_URL, url)
        else:
            absolute_url = url

        # 获取文件名
        filename = os.path.basename(absolute_url.split("?")[0])  # 移除查询参数
        filepath = os.path.join(output_dir, filename)

        # 下载文件
        response = requests.get(absolute_url, stream=True)
        response.raise_for_status()

        # 获取文件大小
        file_size = int(response.headers.get('Content-Length', 0))

        # 保存文件
        with open(filepath, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:  # 过滤掉保持连接的块
                    f.write(chunk)

        return filename, file_size, True

    except Exception as e:
        return absolute_url if 'absolute_url' in locals() else url, str(e), False


def main():
    print(f"下载Font Awesome {VERSION} CSS文件: {CSS_URL}")
    try:
        css_response = requests.get(CSS_URL)
        css_response.raise_for_status()
        css_content = css_response.text

        # 保存CSS文件以供参考
        with open(os.path.join(BASE_DIR, "all.min.css"), "w", encoding="utf-8") as f:
            f.write(css_content)
    except Exception as e:
        print(f"无法下载CSS文件: {str(e)}")
        return

    print("从CSS中提取资源URL...")
    urls = extract_urls(css_content)
    print(f"找到 {len(urls)} 个资源URL")
    print("提取到的URL列表:")
    for i, url in enumerate(urls, 1):
        print(f"{i}. {url}")

    success_count = 0
    for i, url in enumerate(urls, 1):
        print(f"\n处理资源 {i}/{len(urls)}: {url}")
        result, file_size, success = download_resource(url, OUTPUT_DIR)

        if success:
            print(f"✓ 下载成功: {result} ({file_size} bytes)")
            success_count += 1
        else:
            print(f"✗ 下载失败: {result}")

    print(f"\n下载完成! 成功: {success_count}/{len(urls)} 个资源")
    print(f"资源保存至: {os.path.abspath(OUTPUT_DIR)}")


if __name__ == "__main__":
    main()